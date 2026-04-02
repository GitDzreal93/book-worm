#!/usr/bin/env python3
"""
百年孤独 注释版HTML生成器
从epub提取全文，为人名添加ruby注释标签，生成带侧边栏的完整HTML阅读器。
"""

import zipfile
import re
import json
import os
from html.parser import HTMLParser


# ═══════════════════════════════════════════════════════════
# 1. 角色映射表 — 实际epub译名 → 绰号
# ═══════════════════════════════════════════════════════════

CHARACTERS = [
    # --- 一代 ---
    {
        "nick": "霍老",
        "colorClass": "ct-jose",
        "gen": "一代·霍系",
        "desc": "马贡多创始人，疯狂的理想主义者，痴迷科学发明，晚年精神失常被绑在栗树下。",
        "origs": [
            "何塞·阿尔卡蒂奥·布恩迪亚",  # 10 chars, full name
        ],
    },
    {
        "nick": "乌苏拉",
        "colorClass": "ct-female",
        "gen": "一代·女性",
        "desc": "家族真正的脊梁，活了一百多岁，亲历七代兴衰，双目失明后仍凭记忆掌控一切。",
        "origs": [
            "乌尔苏拉·伊瓜兰",
            "乌尔苏拉",
        ],
    },
    # --- 二代 ---
    {
        "nick": "雷上校",
        "colorClass": "ct-orel",
        "gen": "二代·雷系",
        "desc": "发动32次内战，全部失败。晚年在小屋里反复熔化金鱼再重铸，孤独终老。全书最重要的男性人物。",
        "origs": [
            "奥雷里亚诺·布恩迪亚上校",  # 10 chars
            "奧雷里亚诺·布恩迪亚上校",   # 10 chars (variant char)
            "奥雷里亚诺·布恩迪亚",       # 8 chars (without 上校)
            "奧雷里亚诺·布恩迪亚",       # 8 chars (variant char)
            "奥雷里亚诺上校",            # 6 chars (rare)
            "奧雷里亚诺",                 # 4 chars (variant char only - standalone too risky)
        ],
    },
    {
        "nick": "霍大",
        "colorClass": "ct-jose",
        "gen": "二代·霍系",
        "desc": "霍老长子，体格壮硕，随吉卜赛人出走，身上纹满纹身，死后尸体散发鲜花香气。",
        "origs": [
            "何塞·阿尔卡蒂奥",  # 6 chars (2nd gen - this is the son)
        ],
    },
    {
        "nick": "大姑",
        "colorClass": "ct-female",
        "gen": "二代·女性",
        "desc": "霍老小女儿，一生拒绝爱情却爱得最深。亲手烧伤自己的手以拒绝求婚者，终身独居，死前亲手缝自己的寿衣。",
        "origs": [
            "阿玛兰妲·布恩迪亚",  # 7 chars (with family name)
            "阿玛兰妲",           # 3 chars
        ],
    },
    {
        "nick": "养女",
        "colorClass": "ct-female",
        "gen": "二代·女性",
        "desc": "神秘孤儿，带着父母骨灰来到马贡多。嫁给霍大后被家族驱逐，独居至死，是全书最孤独的人物之一。",
        "origs": [
            "丽贝卡·布恩迪亚",  # 6 chars (with family name)
            "丽贝卡",           # 3 chars
        ],
    },
    {
        "nick": "雷梅",
        "colorClass": "ct-female",
        "gen": "二代·女性",
        "desc": "雷上校原配，摩斯科特镇长的女儿，九岁出嫁，生两子后难产而死。",
        "origs": [
            "蕾梅黛丝·摩斯科特",  # 7 chars
            "蕾梅黛丝",           # 3 chars (2nd gen only - distinguish from 俏姑娘)
        ],
    },
    {
        "nick": "皮拉尔",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "算命女人，活145岁，与霍大、雷上校均有私情，见证整个家族兴亡。",
        "origs": [
            "庇拉尔·特尔内拉",
            "庇拉尔",
            "特尔内拉",
        ],
    },
    {
        "nick": "老吉普",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "神秘吉卜赛人，将科学奇迹带入马贡多。死后幽灵长居一室，百年前已将布恩地亚家族的命运全部写入羊皮手稿。",
        "origs": [
            "梅尔基亚德斯",
        ],
    },
    {
        "nick": "琴师",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "意大利音乐家，被大姑和养女先后爱慕，最终被大姑拒绝后自杀。",
        "origs": [
            "皮埃特罗·克雷斯皮",
            "皮埃特罗",
            "克雷斯皮",
        ],
    },
    {
        "nick": "镇长",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "保守党镇长，摩斯科特家族成员，与雷上校一生为敌。",
        "origs": [
            "堂阿波利纳尔·摩斯科特",
            "摩斯科特",
        ],
    },
    {
        "nick": "冤魂",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "被霍老杀死，冤魂不散，逼使霍老创建马贡多。其幽灵长期纠缠霍家。",
        "origs": [
            "普鲁邓希奥·阿基拉尔",
            "阿基拉尔",
        ],
    },
    {
        "nick": "赫将军",
        "colorClass": "ct-orel",
        "gen": "外来人物",
        "desc": "雷上校最亲密的朋友和战友，终生爱慕大姑，战败后被处决。",
        "origs": [
            "赫里内勒多·马尔克斯上校",
            "赫里内勒多·马尔克斯",
            "赫里内勒多",
            "马尔克斯上校",
        ],
    },
    # --- 三代 ---
    {
        "nick": "霍三",
        "colorClass": "ct-jose",
        "gen": "三代·霍系",
        "desc": "霍大与皮拉尔的私生子，战时暴君，被枪决。",
        "origs": [
            "阿尔卡蒂奥·布恩迪亚",  # 7 chars (with family name)
            "阿尔卡蒂奥",           # 4 chars
        ],
    },
    {
        "nick": "雷霍",
        "colorClass": "ct-orel",
        "gen": "三代·雷系",
        "desc": "雷上校与皮拉尔的私生子，爱上姑姑大姑，战死沙场。",
        "origs": [
            "奥雷里亚诺·何塞",  # 6 chars
        ],
    },
    {
        "nick": "圣菲",
        "colorClass": "ct-female",
        "gen": "三代·女性",
        "desc": "霍三之妻，默默操持家务数十年，悄然出走。",
        "origs": [
            "桑塔索菲亚·德拉·彼达",
            "桑塔索菲亚",
            "德拉·彼达",
        ],
    },
    {
        "nick": "雷特",
        "colorClass": "ct-orel",
        "gen": "三代·雷系",
        "desc": "雷上校十七个私生子之一，将铁路带入马贡多。",
        "origs": [
            "奥雷里亚诺·特里斯特",
        ],
    },
    # --- 四代 ---
    {
        "nick": "霍二",
        "colorClass": "ct-jose",
        "gen": "四代·霍系",
        "desc": "大屠杀唯一目击者，无人相信，终身研读手稿。",
        "origs": [
            "何塞·阿尔卡蒂奥第二",  # 8 chars
        ],
    },
    {
        "nick": "雷二",
        "colorClass": "ct-orel",
        "gen": "四代·雷系",
        "desc": "吃喝享乐的大胖子，与情妇同居却娶了贵妇为妻。与双胞胎哥哥霍二性格截然相反。",
        "origs": [
            "奥雷里亚诺第二",  # 6 chars
        ],
    },
    {
        "nick": "贵妇",
        "colorClass": "ct-female",
        "gen": "四代·女性",
        "desc": "雷二之妻，虔诚而高傲的外来贵族，嫁入后将家族与世隔绝，整天写信给看不见的隐形医生。",
        "origs": [
            "堂娜费尔南达·德尔·卡皮奥",
            "费尔南达",           # most common
            "堂娜费尔南达",
        ],
    },
    {
        "nick": "情妇",
        "colorClass": "ct-female",
        "gen": "四代·女性",
        "desc": "雷二的长期情妇，她在场时牲口繁殖能力惊人。真正爱雷二，晚年独自卖彩票为他还债。",
        "origs": [
            "佩特拉·科特斯",
            "佩特拉",
            "科特斯",
        ],
    },
    {
        "nick": "俏女",
        "colorClass": "ct-female",
        "gen": "四代·女性",
        "desc": "绝世美貌浑然不知，男人因她而死，某天抱床单升天消失。",
        "origs": [
            "美人儿蕾梅黛丝",
        ],
    },
    # --- 五代 ---
    {
        "nick": "梅梅",
        "colorClass": "ct-female",
        "gen": "五代·女性",
        "desc": "爱上修车工黄蝶男，被母亲关进修道院后终生沉默。",
        "origs": [
            "梅梅",
            "雷纳塔",  # her real name, rare
        ],
    },
    {
        "nick": "小阿",
        "colorClass": "ct-female",
        "gen": "五代·女性",
        "desc": "家族最后活力之人，与侄儿雷末乱伦，难产而死。",
        "origs": [
            "阿玛兰妲·乌尔苏拉",  # 7 chars (must be before 阿玛兰妲)
        ],
    },
    {
        "nick": "黄蝶男",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "修车工，身边总有黄蝴蝶，爱梅梅，被枪伤后终身瘫痪。",
        "origs": [
            "马乌里肖·巴比伦",
            "马乌里肖",
            "巴比伦",
        ],
    },
    {
        "nick": "加斯东",
        "colorClass": "ct-outsider",
        "gen": "外来人物",
        "desc": "小阿的比利时丈夫，温和宽厚，最终离开马贡多。",
        "origs": [
            "加斯通",
        ],
    },
    # --- 六代 ---
    {
        "nick": "雷末",
        "colorClass": "ct-orel",
        "gen": "六代·雷系",
        "desc": "最后一个奥雷良诺，破译羊皮手稿，马贡多随之消亡。",
        "origs": [
            "奥雷里亚诺·巴比伦",
        ],
    },
]


# ═══════════════════════════════════════════════════════════
# 2. 从epub提取章节文本
# ═══════════════════════════════════════════════════════════

class ChapterExtractor(HTMLParser):
    """从epub的HTML文件中提取段落文本和脚注"""

    def __init__(self):
        super().__init__()
        self.paragraphs = []  # list of {"type": "para"|"footnote", "text": str}
        self._current = []
        self._in_footnote_list = False
        self._in_footnote_item = False
        self._footnote_parts = []
        self._skip_sup = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        cls = attrs_dict.get('class', '')

        if tag == 'ul' and 'calibre_10' in cls:
            self._in_footnote_list = True
            return
        if tag == 'li':
            self._in_footnote_item = True
            self._footnote_parts = []
            return
        if tag == 'sup':
            self._skip_sup = True
            return
        # Track paragraph start
        if tag == 'p' and ('calibre_6' in cls or 'calibre_7' in cls):
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
            # Keep footnote text (both calibre_8 numbers and calibre_12 content)
            cls = ''
            self._footnote_parts.append(data)
        elif self._current is not None:
            self._current.append(data)


def extract_chapters(epub_path):
    """Extract all chapters from the epub file."""
    zf = zipfile.ZipFile(epub_path)
    chapters = []

    for i in range(3, 23):  # part0003.html ~ part0022.html
        fname = f'text/part{i:04d}.html'
        with zf.open(fname) as f:
            content = f.read().decode('utf-8')

        extractor = ChapterExtractor()
        extractor.feed(content)
        chapters.append(extractor.paragraphs)

    zf.close()
    return chapters


# ═══════════════════════════════════════════════════════════
# 3. 构建替换表（按长度降序排列）
# ═══════════════════════════════════════════════════════════

def build_replacement_table(characters):
    """
    Build a list of (orig_name, char_info) tuples,
    sorted by orig_name length descending (longest first).
    """
    replacements = []
    for char in characters:
        for orig in char["origs"]:
            replacements.append((orig, char))

    # Sort by length descending - critical for correct matching
    replacements.sort(key=lambda x: len(x[0]), reverse=True)
    return replacements


# ═══════════════════════════════════════════════════════════
# 4. 文本替换（使用占位符防二次匹配）
# ═══════════════════════════════════════════════════════════

def make_ruby_tag(orig_name, char_info):
    """Generate a <ruby> annotation tag for a character name."""
    return (
        f'<ruby class="cn {char_info["colorClass"]}" '
        f'data-nick="{char_info["nick"]}" '
        f'data-orig="{orig_name}" '
        f'data-gen="{char_info["gen"]}" '
        f'data-desc="{char_info["desc"]}">'
        f'{orig_name}<rt>{char_info["nick"]}</rt></ruby>'
    )


def annotate_text(text, replacements):
    """
    Replace character names in text with ruby annotation tags.
    Uses placeholders to prevent double-matching.
    """
    placeholders = {}
    counter = [0]

    for orig_name, char_info in replacements:
        start = 0
        while True:
            idx = text.find(orig_name, start)
            if idx == -1:
                break
            # Create a unique placeholder
            ph = f'\x00PH{counter[0]}\x00'
            counter[0] += 1
            text = text[:idx] + ph + text[idx + len(orig_name):]
            placeholders[ph] = make_ruby_tag(orig_name, char_info)
            start = idx + len(ph)

    # Replace all placeholders with actual tags
    for ph, tag in placeholders.items():
        text = text.replace(ph, tag)

    return text


# ═══════════════════════════════════════════════════════════
# 5. 生成完整HTML
# ═══════════════════════════════════════════════════════════

def generate_html(chapters, characters):
    """Generate the complete annotated HTML file."""
    replacements = build_replacement_table(characters)

    # Build chapter HTML sections
    chapter_html_parts = []
    for i, paras in enumerate(chapters):
        ch_num = i + 1
        ch_id = f'ch-{ch_num}'

        # Chinese chapter number
        cn_nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
        cn_num = cn_nums[ch_num - 1]

        ch_parts = [f'      <section class="chapter" id="{ch_id}">']
        ch_parts.append(f'        <h2>第 {cn_num} 章</h2>')

        for para in paras:
            if para["type"] == "para":
                annotated = annotate_text(para["text"], replacements)
                ch_parts.append(f'        <p>{annotated}</p>')
            elif para["type"] == "footnote":
                ch_parts.append(f'        <p class="footnote">{para["text"]}</p>')

        ch_parts.append('      </section>')
        chapter_html_parts.append('\n'.join(ch_parts))

    chapters_html = '\n\n'.join(chapter_html_parts)

    # Build TOC items
    toc_items = []
    for i in range(20):
        cn_nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
        toc_items.append(f'        <a class="toc-item" id="toc-ch-{i+1}" onclick="jumpTo(\'ch-{i+1}\')">第{cn_nums[i]}章</a>')

    toc_html = '\n'.join(toc_items)

    # Build character chips for sidebar (grouped by generation)
    gen_groups = {
        '一代': [],
        '二代': [],
        '三代': [],
        '四代': [],
        '五代': [],
        '六代': [],
        '外来人物': [],
    }
    for char in characters:
        gen = char['gen'].split('·')[0]  # e.g., "一代" from "一代·霍系"
        if gen not in gen_groups:
            gen = '外来人物'
        gen_groups[gen].append(char)

    chip_rows = []
    for gen_name in ['一代', '二代', '三代', '四代', '五代', '六代', '外来人物']:
        chars_in_gen = gen_groups[gen_name]
        if not chars_in_gen:
            continue
        chips = []
        for c in chars_in_gen:
            main_orig = c['origs'][0]  # Use first (longest) variant for display
            chips.append(
                f'              <span class="chip {c["colorClass"]}" '
                f'data-nick="{c["nick"]}" data-orig="{main_orig}" '
                f'data-gen="{c["gen"]}" data-desc="{c["desc"]}">{c["nick"]}</span>'
            )
        chip_rows.append(
            f'          <div class="char-row">\n'
            f'            <div class="char-row-label">{gen_name}</div>\n'
            f'            <div class="char-chips">\n' +
            '\n'.join(chips) +
            '\n            </div>\n'
            f'          </div>'
        )
    chips_html = '\n'.join(chip_rows)

    # Build family tree (plain string, no f-string issues)
    tree_html = (
        '<div style="font-size:11px;font-family:var(--ui);color:var(--ink2);margin-bottom:12px;opacity:0.6;letter-spacing:0.15em">七代家族谱</div>\n'
        '<div style="font-size:12px;font-family:var(--ui);line-height:2;color:var(--ink)">\n'
        '  <div style="margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">一代</div>\n'
        '    <div><span style="color:var(--jose);font-weight:600">霍老</span> × <span style="color:var(--female);font-weight:600">乌苏拉</span></div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px;margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">二代</div>\n'
        '    <div><span style="color:var(--jose);font-weight:600">霍大</span> × <span style="color:var(--female);font-weight:600">养女</span></div>\n'
        '    <div><span style="color:var(--orel);font-weight:600">雷上校</span> × <span style="color:var(--female);font-weight:600">雷梅</span>（原配）</div>\n'
        '    <div style="margin-left:8px;font-size:11px;color:var(--ink2)">另与<span style="color:var(--outsider)">皮拉尔</span>育有17私生子（雷霍、雷特等）</div>\n'
        '    <div><span style="color:var(--female);font-weight:600">大姑</span>（终身未嫁）</div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px;margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">三代</div>\n'
        '    <div><span style="color:var(--jose);font-weight:600">霍三</span>（霍大与皮拉尔私生）× <span style="color:var(--female);font-weight:600">圣菲</span></div>\n'
        '    <div><span style="color:var(--orel);font-weight:600">雷霍</span>（雷上校与皮拉尔私生）</div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px;margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">四代（霍三之子）</div>\n'
        '    <div><span style="color:var(--jose);font-weight:600">霍二</span>（大屠杀目击者）</div>\n'
        '    <div><span style="color:var(--orel);font-weight:600">雷二</span> × <span style="color:var(--female);font-weight:600">贵妇</span>（妻）/ <span style="color:var(--female);font-weight:600">情妇</span></div>\n'
        '    <div><span style="color:var(--female);font-weight:600">俏女</span>（升天消失）</div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px;margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">五代（雷二之子女）</div>\n'
        '    <div><span style="color:var(--female);font-weight:600">梅梅</span> × <span style="color:var(--outsider);font-weight:600">黄蝶男</span>（私生）</div>\n'
        '    <div><span style="color:var(--female);font-weight:600">小阿</span> × <span style="color:var(--outsider);font-weight:600">加斯东</span></div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px;margin-bottom:12px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">六代</div>\n'
        '    <div><span style="color:var(--orel);font-weight:600">雷末</span>（梅梅私生）× <span style="color:var(--female);font-weight:600">小阿</span>（乱伦）</div>\n'
        '  </div>\n'
        '  <div style="border-left:1px solid var(--line);padding-left:12px;margin-left:8px">\n'
        '    <div style="font-size:10px;color:var(--ink2);letter-spacing:0.2em;margin-bottom:4px;opacity:0.55">七代</div>\n'
        '    <div style="color:var(--ink2)">有尾婴儿（被蚂蚁吃掉，预言终结）</div>\n'
        '  </div>\n'
        '</div>'
    )

    # Read template and insert dynamic content
    template = read_template()
    html = template.replace('__CHAPTERS__', chapters_html)
    html = html.replace('__TOC__', toc_html)
    html = html.replace('__CHIPS__', chips_html)
    html = html.replace('__TREE__', tree_html)

    return html


def read_template():
    """Read the HTML template file."""
    template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()


# ═══════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    epub_path = os.path.join(base_dir, '百年孤独 = Cien años de soledad ( etc.) (Z-Library).epub')
    output_path = os.path.join(base_dir, '百年孤独注释版.html')

    print(f'正在读取 epub: {epub_path}')
    chapters = extract_chapters(epub_path)
    print(f'已提取 {len(chapters)} 个章节')

    total_paras = sum(len(ch) for ch in chapters)
    print(f'共 {total_paras} 个段落/脚注')

    print('正在生成注释HTML...')
    html = generate_html(chapters, CHARACTERS)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f'已生成: {output_path} ({size_mb:.1f} MB)')
    print('完成！用浏览器打开即可阅读。')
