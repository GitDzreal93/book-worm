#!/usr/bin/env python3
"""
EPUB 人名注释版生成器
用法:
    python3 epub_annotator.py <epub路径> <角色映射JSON> <输出HTML路径>
    python3 epub_annotator.py <epub路径> --extract-names    # 只提取人名候选
"""

import zipfile
import re
import os
import sys
import json
from html.parser import HTMLParser
from html import escape


# ═══════════════════════════════════════════════════════════
# 1. 从 epub 提取章节文本
# ═══════════════════════════════════════════════════════════

class ChapterExtractor(HTMLParser):
    """从 epub 的 HTML 文件中提取段落文本和脚注"""

    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self._current = []
        self._in_footnote_list = False
        self._in_footnote_item = False
        self._footnote_parts = []
        self._skip_sup = False

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class', '')
        if tag == 'ul' and 'footnote' in cls.lower():
            self._in_footnote_list = True
            return
        if tag == 'li':
            self._in_footnote_item = True
            self._footnote_parts = []
            return
        if tag == 'sup':
            self._skip_sup = True
            return
        if tag == 'p':
            self._current = []

    def handle_endtag(self, tag):
        if tag == 'ul' and self._in_footnote_list:
            self._in_footnote_list = False
            return
        if tag == 'li' and self._in_footnote_item:
            self._in_footnote_item = False
            fn_text = ''.join(self._footnote_parts).strip()
            if fn_text:
                self.paragraphs.append({"type": "footnote", "text": fn_text})
            return
        if tag == 'sup':
            self._skip_sup = False
            return
        if tag == 'p':
            text = ''.join(self._current).strip()
            if text:
                self.paragraphs.append({"type": "para", "text": text})
            self._current = []

    def handle_data(self, data):
        if self._skip_sup:
            return
        if self._in_footnote_item:
            self._footnote_parts.append(data)
        elif self._current is not None:
            self._current.append(data)


def extract_chapters(epub_path):
    """从 epub 提取所有章节。返回 list[list[dict]]，每个 dict 有 type/text 字段。

    尝试多种章节检测策略：
    - 所有 html/xhtml 文件（排除前言、版权、推广等）
    - 如果部分文件段落太少，认为是非正文，自动跳过
    """
    zf = zipfile.ZipFile(epub_path)
    all_files = [f for f in zf.namelist() if f.endswith(('.html', '.xhtml'))]
    all_files.sort()

    chapters = []
    for fname in all_files:
        with zf.open(fname) as f:
            content = f.read().decode('utf-8')
        ext = ChapterExtractor()
        ext.feed(content)
        paras = ext.paragraphs

        # 只保留正文段落足够的文件（过滤标题页、版权页、推广页等）
        para_count = sum(1 for p in paras if p["type"] == "para")
        if para_count < 3:
            continue

        chapters.append(paras)

    zf.close()
    return chapters


def extract_all_text(epub_path):
    """提取全书纯文本，用于人名分析。"""
    zf = zipfile.ZipFile(epub_path)
    all_text = ''
    all_files = sorted(f for f in zf.namelist() if f.endswith(('.html', '.xhtml')))
    for fname in all_files:
        with zf.open(fname) as f:
            content = f.read().decode('utf-8')
        all_text += re.sub(r'<[^>]+>', ' ', content)
    zf.close()
    return all_text


def extract_name_candidates(epub_path):
    """提取 epub 中所有人名候选（带间隔号·的词组），按频率排序。"""
    text = extract_all_text(epub_path)

    # 匹配 2-6 个中文字符通过 · 连接的词组
    raw = re.findall(r'[\u4e00-\u9fff]{2,6}(?:·[\u4e00-\u9fff]{2,6})+', text)

    from collections import Counter
    freq = Counter(raw)

    # 按频率降序，去重
    seen = set()
    results = []
    for name, count in freq.most_common():
        if count >= 2 and name not in seen:
            results.append((count, name))
            seen.add(name)

    print(f"共找到 {len(results)} 个不同的人名候选（出现 ≥ 2 次）：\n")
    for count, name in results:
        print(f"  {count:4d}  {name}")


# ═══════════════════════════════════════════════════════════
# 2. 构建替换表 & 文本注释
# ═══════════════════════════════════════════════════════════

def build_replacement_table(characters):
    """构建替换表，按原名字符长度降序排列（长名优先）。

    Args:
        characters: list[dict], 每个 dict 有 nick/colorClass/gen/desc/origs 字段

    Returns:
        list[tuple(str, dict)], 每项是 (原名, 角色信息dict)
    """
    replacements = []
    for char in characters:
        for orig in char.get("origs", []):
            replacements.append((orig, char))
    replacements.sort(key=lambda x: len(x[0]), reverse=True)
    return replacements


def make_ruby_tag(orig_name, char_info):
    """生成 <ruby> 注释标签。"""
    desc_escaped = char_info["desc"].replace('"', '&quot;')
    return (
        f'<ruby class="cn {char_info["colorClass"]}" '
        f'data-nick="{char_info["nick"]}" '
        f'data-orig="{escape(orig_name)}" '
        f'data-gen="{char_info["gen"]}" '
        f'data-desc="{desc_escaped}">'
        f'{orig_name}<rt>{char_info["nick"]}</rt></ruby>'
    )


def annotate_text(text, replacements):
    """给文本中的人名加 ruby 注释标签。

    核心算法：长名优先 + 占位符防二次匹配。
    每次匹配后用占位符替换已匹配的文本，防止后续短名误伤。
    """
    placeholders = {}
    counter = [0]

    for orig_name, char_info in replacements:
        start = 0
        while True:
            idx = text.find(orig_name, start)
            if idx == -1:
                break
            ph = f'\x00PH{counter[0]}\x00'
            counter[0] += 1
            text = text[:idx] + ph + text[idx + len(orig_name):]
            placeholders[ph] = make_ruby_tag(orig_name, char_info)
            start = idx + len(ph)

    for ph, tag in placeholders.items():
        text = text.replace(ph, tag)

    return text


# ═══════════════════════════════════════════════════════════
# 3. HTML 模板组装
# ═══════════════════════════════════════════════════════════

CN_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
           '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
           '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十',
           '三十一', '三十二', '三十三', '三十四', '三十五', '三十六', '三十七', '三十八', '三十九', '四十']


def to_cn_num(n):
    if 1 <= n <= 40:
        return CN_NUMS[n - 1]
    return str(n)


def generate_html(chapters, characters, book_title="注释阅读版"):
    """生成完整的注释 HTML。"""
    replacements = build_replacement_table(characters)

    # --- 章节内容 ---
    chapter_parts = []
    for i, paras in enumerate(chapters):
        ch_id = f'ch-{i + 1}'
        cn_num = to_cn_num(i + 1)
        lines = [f'      <section class="chapter" id="{ch_id}">',
                 f'        <h2>第 {cn_num} 章</h2>']
        for para in paras:
            if para["type"] == "para":
                annotated = annotate_text(para["text"], replacements)
                lines.append(f'        <p>{annotated}</p>')
            elif para["type"] == "footnote":
                lines.append(f'        <p class="footnote">{escape(para["text"])}</p>')
        lines.append('      </section>')
        chapter_parts.append('\n'.join(lines))
    chapters_html = '\n\n'.join(chapter_parts)

    # --- 目录 ---
    toc_lines = []
    for i in range(len(chapters)):
        cn_num = to_cn_num(i + 1)
        toc_lines.append(
            f'        <a class="toc-item" id="toc-ch-{i+1}" onclick="jumpTo(\'ch-{i+1}\')">第{cn_num}章</a>'
        )
    toc_html = '\n'.join(toc_lines)

    # --- 人物速查 chips ---
    gen_groups = {}
    for char in characters:
        gen = char['gen'].split('·')[0] if '·' in char['gen'] else char['gen']
        gen_groups.setdefault(gen, []).append(char)

    chip_lines = ['          <div class="char-map-title">全部人物速查</div>']
    for gen_name in sorted(gen_groups.keys()):
        chars_in_gen = gen_groups[gen_name]
        chips = []
        for c in chars_in_gen:
            main_orig = c['origs'][0]
            chips.append(
                f'              <span class="chip {c["colorClass"]}" '
                f'data-nick="{c["nick"]}" data-orig="{main_orig}" '
                f'data-gen="{c["gen"]}" data-desc="{c["desc"]}">{c["nick"]}</span>'
            )
        chip_lines.append(
            f'          <div class="char-row">\n'
            f'            <div class="char-row-label">{gen_name}</div>\n'
            f'            <div class="char-chips">\n' +
            '\n'.join(chips) +
            '\n            </div>\n'
            f'          </div>'
        )
    chips_html = '\n'.join(chip_lines)

    # --- 家族关系图 ---
    # 按人物出现的代际关系自动生成简单的树状图
    tree_lines = [
        '          <div style="font-size:11px;font-family:var(--ui);color:var(--ink2);margin-bottom:12px;opacity:0.6;letter-spacing:0.15em">人物关系</div>',
        '          <div style="font-size:12px;font-family:var(--ui);line-height:2;color:var(--ink)">',
    ]

    # 按 gen 分组
    for gen_name in sorted(gen_groups.keys()):
        chars_in_gen = gen_groups[gen_name]
        tree_lines.append(
            f'            <div style="margin-bottom:8px"><span style="font-size:10px;color:var(--ink2);letter-spacing:0.15em;opacity:0.55">{gen_name}</span></div>'
        )
        for c in chars_in_gen:
            color_var = c["colorClass"].replace("ct-", "var(--")
            tree_lines.append(
                f'            <div><span style="color:{color_var};font-weight:600">{c["nick"]}</span>'
                f'<span style="font-size:11px;color:var(--ink2)"> ({escape(c["origs"][0])})</span></div>'
            )

    tree_lines.append('          </div>')
    tree_html = '\n'.join(tree_lines)

    # --- 读取模板并插入 ---
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(script_dir, 'template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    html = template.replace('__CHAPTERS__', chapters_html)
    html = html.replace('__TOC__', toc_html)
    html = html.replace('__CHIPS__', chips_html)
    html = html.replace('__TREE__', tree_html)
    html = html.replace('__TITLE__', escape(book_title))

    return html


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

def main():
    args = sys.argv[1:]

    if len(args) < 1:
        print(__doc__)
        print()
        print("示例:")
        print("  python3 epub_annotator.py book.epub chars.json output.html")
        print("  python3 epub_annotator.py book.epub --extract-names")
        return

    epub_path = args[0]

    # 只提取人名候选
    if '--extract-names' in args:
        print(f"正在分析: {epub_path}\n")
        extract_name_candidates(epub_path)
        return

    if len(args) < 3:
        print("错误：需要指定角色映射 JSON 和输出 HTML 路径")
        print("用法: python3 epub_annotator.py <epub> <chars.json> <output.html>")
        return

    chars_path = args[1]
    output_path = args[2]

    # 加载角色映射
    with open(chars_path, 'r', encoding='utf-8') as f:
        characters = json.load(f)

    # 从 epub 文件名推断书名
    book_title = os.path.splitext(os.path.basename(epub_path))[0]

    print(f"epub:   {epub_path}")
    print(f"角色:   {chars_path} ({len(characters)} 个角色)")
    print(f"输出:   {output_path}")
    print()

    # 提取章节
    print("提取章节...")
    chapters = extract_chapters(epub_path)
    print(f"  {len(chapters)} 个章节, {sum(len(ch) for ch in chapters)} 个段落/脚注")

    # 生成 HTML
    print("生成注释HTML...")
    html = generate_html(chapters, characters, book_title)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"  完成！({size_mb:.1f} MB)")


if __name__ == '__main__':
    main()
