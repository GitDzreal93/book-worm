# 实现计划：改进人名提取与注释替换准确性

**分支**: `003-improve-name-annotation` | **日期**: 2026-03-29 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格来自 `/specs/003-improve-name-annotation/spec.md`

## 摘要

将 demo 项目的两个关键改进集成到现有项目中：(1) 用占位符算法替换当前正则注释逻辑，解决子串误伤问题；(2) 添加全文人名候选提取，将真实人名数据注入 LLM prompt 提升角色提取准确性。

## 技术背景

**语言/版本**: TypeScript 5 / Next.js 16
**主要依赖**: 无新增依赖
**存储**: PostgreSQL (现有 schema 不变)
**测试**: Vitest
**项目类型**: Web 应用 (App Router)

## 项目结构

```text
src/
├── lib/
│   ├── annotate.ts          # 重写：占位符算法
│   ├── extract-names.ts     # 新增：人名候选提取
│   └── types.ts             # 不变
├── app/api/books/[bookSlug]/generate/
│   └── route.ts             # 修改：融入人名候选，改进 prompt
└── ...

tests/
└── lib/
    ├── annotate.test.ts     # 新增
    └── extract-names.test.ts # 新增
```

## 实现任务

### T001: 重写 annotate.ts — 占位符算法 [US1]
- 移植 demo 的 placeholder 算法到 TypeScript
- 保持 `annotateText(text, characters)` 公共 API 不变
- 修复 aliasMap 碰撞（多个角色共享同一别名）

### T002: 新增 extract-names.ts [US2]
- `extractNameCandidates(text)` 提取含间隔号人名
- 按频率排序，阈值 ≥ 2

### T003: 改进 generate/route.ts [US2]
- 扩大采样范围
- 调用 extractNameCandidates()
- 将人名候选注入 LLM prompt
- 改进 CHAR_SYSTEM prompt

### T004: 编写单元测试 [US1, US2]
- annotateText() 边界情况测试
- extractNameCandidates() 准确性测试
