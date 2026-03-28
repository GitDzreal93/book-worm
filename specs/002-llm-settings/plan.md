# 实现计划：LLM 大模型设置页

**分支**: `002-llm-settings` | **日期**: 2026-03-28 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格来自 `/specs/002-llm-settings/spec.md`

## 摘要

为 BookWorm 阅读器新增设置页面，允许用户通过 UI 配置 AI 服务商（OpenAI / Anthropic / Google）、管理 API Key、选择默认模型、调整生成参数（温度、最大 Token）以及自定义翻译/查词/摘要的系统提示词。配置持久化到数据库，优先级高于环境变量。

## 技术背景

**语言/版本**: TypeScript 5（严格模式）
**主要依赖**: Next.js 16 (App Router), React 19, Prisma 6, Vercel AI SDK (`ai` + `@ai-sdk/openai`)
**存储**: PostgreSQL（通过 Prisma ORM）
**测试**: Vitest（单元测试）、Playwright（E2E 测试）
**目标平台**: Web（桌面浏览器优先，兼容移动端）
**项目类型**: Web 应用
**性能目标**: 设置页面 LCP < 1s；API Key 验证 < 5s
**约束条件**: 单用户本地部署，API Key 存储在本地数据库
**规模/范围**: 1 个设置页面，3 个 API 路由，1 个新数据模型

## 宪法检查

*门控：必须在第 0 阶段研究之前通过。第 1 阶段设计完成后需重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| 代码质量 | PASS | TypeScript 严格模式，新模块 `src/lib/settings.ts` 职责单一，共享类型放 `src/types/` |
| 测试标准 | PASS | 新增 API 路由需编写单元测试；设置页面需 E2E 测试 |
| 用户体验一致性 | PASS | 复用现有 `NavBar` 组件添加导航入口，使用项目设计令牌（Tailwind） |
| 性能要求 | PASS | 设置页为客户端渲染，LCP < 1s；API Key 验证为轻量调用 |

## 项目结构

### 文档（本功能）

```text
specs/002-llm-settings/
├── plan.md              # 本文件
├── research.md          # 第 0 阶段输出
├── data-model.md        # 第 1 阶段输出
├── quickstart.md        # 第 1 阶段输出
├── contracts/           # 第 1 阶段输出
│   └── api.md           # 设置 API 接口契约
└── tasks.md             # 第 2 阶段输出（/speckit.tasks）
```

### 源代码（仓库根目录）

```text
src/
├── app/
│   ├── settings/                    # 设置页面 [新增]
│   │   └── page.tsx                 # 设置页面服务端组件
│   └── api/
│       └── settings/                # 设置 API 路由 [新增]
│           ├── route.ts             # GET/PUT 全局设置
│           ├── verify-key/route.ts  # POST 验证 API Key
│           └── models/route.ts      # GET 可用模型列表
├── components/
│   └── settings/                    # 设置页组件 [新增]
│       ├── SettingsPageClient.tsx   # 设置页客户端主组件
│       ├── ProviderCard.tsx         # 服务商配置卡片
│       ├── ModelSelector.tsx        # 模型选择器
│       ├── ParameterSlider.tsx      # 参数滑块（温度等）
│       └── PromptEditor.tsx         # 提示词编辑器
├── lib/
│   ├── ai-client.ts                 # [修改] 优先读取数据库配置
│   ├── settings.ts                  # [新增] 设置读写服务
│   └── default-prompts.ts           # [新增] 默认提示词模板
└── types/
    └── settings.ts                  # [新增] 设置相关类型定义
```

**结构决策**: 沿用现有 Web 应用单体结构。设置页面放在 `src/app/settings/`，API 路由放在 `src/app/api/settings/`，组件放在 `src/components/settings/`，共享类型放 `src/types/settings.ts`。

## 复杂度追踪

无需宪法豁免项。本功能完全在现有架构内实现。
