---

description: "改进人名提取与注释替换准确性 — 任务清单"

---

# 任务清单：改进人名提取与注释替换准确性

**输入**: 来自 `/specs/003-improve-name-annotation/` 的设计文档
**前置条件**: plan.md（必需）、spec.md

## 格式：`[ID] [P?] [故事] 描述`

## 阶段 1：核心实现

**目的**: 实现占位符注释算法和人名候选提取

- [X] T001 [US1] 重写 `src/lib/annotate.ts` — 移植占位符算法，修复 aliasMap 碰撞
- [X] T002 [P] [US2] 新增 `src/lib/extract-names.ts` — 全文人名候选提取函数
- [X] T003 [US2] 修改 `src/app/api/books/[bookSlug]/generate/route.ts` — 扩大采样、融入人名候选、改进 LLM prompt

---

## 阶段 2：测试

**目的**: 验证注释算法和人名提取的准确性

- [X] T004 [P] [US1] 新增 `__tests__/lib/annotate.test.ts` — 占位符算法边界情况测试
- [X] T005 [P] [US2] 新增 `__tests__/lib/extract-names.test.ts` — 人名提取准确性和频率统计测试

---

## 依赖与执行顺序

- **T001**: 无依赖，立即开始
- **T002**: 无依赖，可与 T001 并行
- **T003**: 依赖 T002（需要 import extractNameCandidates）
- **T004**: 依赖 T001（测试 annotate.ts）
- **T005**: 依赖 T002（测试 extract-names.ts）
