# 实现计划：沉浸式小说阅读器

**分支**: `001-immersive-novel-reader` | **日期**: 2026-03-27 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格来自 `specs/001-immersive-novel-reader/spec.md`

## 摘要

将现有的 Book-Worm 原型（仅支持《百年孤独》单本书、固定数据种子）扩展为一个完整的沉浸式小说阅读平台。核心能力包括：epub 文件导入与解析、多书籍管理、人物知识库增强（名称变体支持）、双语对照阅读、智能词汇学习（SRS 算法）、章节梗概、阅读标注和阅读统计。技术方案沿用现有技术栈（Next.js App Router + Prisma + PostgreSQL + Tailwind CSS），新增 epub 解析、AI 服务集成和 SRS 算法模块。

## 技术背景

**语言/版本**: TypeScript 5（严格模式）
**主要依赖**: Next.js 16.2（App Router）、React 19、Prisma 6、Tailwind CSS 4、cheerio 1.2
**存储**: PostgreSQL（通过 Prisma ORM）
**测试**: Vitest（单元测试）、Playwright（集成与端到端测试）
**目标平台**: 桌面浏览器（Chrome、Firefox、Safari、Edge）
**项目类型**: Web 应用（全栈单体项目）
**性能目标**: LCP < 2.5s、JS 包体积 < 200KB gzip、API p95 读 < 500ms、人名切换 < 200ms
**约束条件**: 单用户本地环境，暂不考虑云端部署和多设备同步
**规模/范围**: 支持任意数量的 epub 书籍导入，单本书可含 200+ 章节

## 宪法检查

*门控：必须在第 0 阶段研究之前通过。第 1 阶段设计完成后需重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| 一、代码质量 | ✅ 通过 | TypeScript 严格模式已启用，ESLint 已配置，代码组织遵循 src/lib/、src/components/ 约定 |
| 二、测试标准 | ✅ 通过 | Vitest 和 Playwright 已安装，新增功能将同步编写测试 |
| 三、用户体验一致性 | ⚠️ 需关注 | 现有组件库需扩展：新增书架页面、翻译面板、词汇卡片、笔记面板等组件，需确保设计令牌一致 |
| 四、性能要求 | ⚠️ 需关注 | 大量段落（200+ 章节）的分页/虚拟化渲染需设计；翻译批量生成需异步处理避免阻塞 |

**行动项**:
- 新增组件必须复用现有设计令牌（globals.css 中的 CSS 变量）
- 长列表（书架、目录、生词本）需实现虚拟滚动或分页
- 大量段落的阅读页面需评估虚拟化渲染的必要性
- 翻译生成使用后台队列，前端通过轮询或 SSE 获取进度

## 项目结构

### 文档（本功能）

```text
specs/001-immersive-novel-reader/
├── plan.md              # 本文件
├── research.md          # 技术调研结果
├── data-model.md        # 数据模型设计
├── quickstart.md        # 快速开始指南
├── contracts/           # API 接口契约
│   └── api-routes.md
└── tasks.md             # 任务清单（由 /speckit.tasks 生成）
```

### 源代码（仓库根目录）

```text
src/
├── app/
│   ├── page.tsx                    # 首页 → 重定向到书架
│   ├── shelf/
│   │   └── page.tsx                # 书架页面（书籍列表）
│   ├── read/[bookSlug]/
│   │   ├── page.tsx                # 阅读页面（服务端组件）
│   │   └── ReaderLayoutClient.tsx  # 阅读布局客户端组件
│   ├── vocabulary/
│   │   └── page.tsx                # 生词本页面
│   ├── review/
│   │   └── page.tsx                # SRS 复习页面
│   ├── notes/
│   │   └── page.tsx                # 笔记浏览页面
│   ├── stats/
│   │   └── page.tsx                # 阅读统计仪表盘
│   ├── layout.tsx                  # 根布局
│   └── api/
│       ├── books/
│       │   ├── route.ts            # GET 书架列表 / POST 导入书籍
│       │   └── [bookId]/
│       │       ├── route.ts        # GET/DELETE 单本书籍
│       │       └── import/
│       │           └── route.ts    # POST epub 文件上传与解析
│       ├── books/[bookSlug]/
│       │   ├── chapters/route.ts   # GET 章节列表
│       │   ├── characters/route.ts # GET 人物列表
│       │   ├── family-tree/route.ts# GET 家族关系
│       │   └── progress/
│       │       └── route.ts        # GET/PUT 阅读进度
│       ├── translate/
│       │   └── route.ts            # POST 触发翻译 / GET 翻译进度
│       ├── vocabulary/
│       │   ├── route.ts            # GET 生词列表 / POST 查词
│       │   └── review/
│       │       └── route.ts        # GET 待复习单词 / POST 提交复习结果
│       ├── highlights/
│       │   └── route.ts            # GET/POST/PUT/DELETE 高亮标注
│       ├── summaries/
│       │   └── route.ts            # GET/POST 章节梗概
│       └── stats/
│           └── route.ts            # GET 阅读统计数据
├── components/
│   ├── layout/
│   │   ├── ThemeProvider.tsx        # 主题切换（已有）
│   │   └── SidebarProvider.tsx      # 侧边栏状态（已有，需扩展）
│   ├── reader/
│   │   ├── AnnotatedText.tsx        # 标注文本（已有，需扩展）
│   │   ├── ChapterSection.tsx       # 章节区块（已有，需扩展）
│   │   ├── CharacterTooltip.tsx     # 人物悬浮卡（已有）
│   │   ├── ReaderContent.tsx        # 阅读内容（已有，需扩展）
│   │   ├── TextSwapButton.tsx       # 人名切换按钮（已有）
│   │   ├── TranslationPanel.tsx     # 翻译面板（新增）
│   │   ├── WordTooltip.tsx          # 词汇释义弹窗（新增）
│   │   └── HighlightToolbar.tsx     # 高亮工具栏（新增）
│   ├── shelf/
│   │   ├── BookCard.tsx             # 书籍卡片（新增）
│   │   ├── BookGrid.tsx             # 书籍网格（新增）
│   │   └── ImportDialog.tsx         # 导入对话框（新增）
│   ├── sidebar/
│   │   ├── Sidebar.tsx              # 侧边栏容器（已有）
│   │   ├── SidebarTabs.tsx          # 标签切换（已有，需扩展）
│   │   ├── TableOfContents.tsx      # 目录（已有）
│   │   ├── CharacterPanel.tsx       # 人物面板（已有）
│   │   ├── CharacterCard.tsx        # 人物卡片（已有）
│   │   ├── CharacterMap.tsx         # 人物地图（已有）
│   │   ├── CharacterChip.tsx        # 人物芯片（已有）
│   │   ├── FamilyTree.tsx           # 家族树（已有）
│   │   ├── Legend.tsx               # 图例（已有）
│   │   ├── DragHandle.tsx           # 拖拽手柄（已有）
│   │   └── NotesPanel.tsx           # 笔记面板（新增）
│   ├── vocabulary/
│   │   ├── WordCard.tsx             # 生词卡片（新增）
│   │   ├── ReviewCard.tsx           # 复习卡片（新增）
│   │   └── ReviewControls.tsx       # 复习控制按钮（新增）
│   └── stats/
│       ├── StatsDashboard.tsx       # 统计仪表盘（新增）
│       └── ReadingChart.tsx         # 阅读趋势图（新增）
├── lib/
│   ├── prisma.ts                    # Prisma 客户端（已有）
│   ├── types.ts                     # 类型定义（已有，需扩展）
│   ├── utils.ts                     # 工具函数（已有）
│   ├── epub-parser.ts               # EPUB 解析器（新增）
│   ├── ai-client.ts                 # AI 服务客户端（新增）
│   ├── srs.ts                       # SRS 间隔重复算法（新增）
│   └── dictionary.ts                # 词典查询服务（新增）
├── seed/
│   ├── seed.ts                      # 种子数据入口（已有）
│   └── characters.ts                # 人物种子数据（已有）
└── generated/
    └── prisma/                      # Prisma 生成文件

prisma/
├── schema.prisma                    # 数据模型（已有，需扩展）
├── migrations/                      # 数据库迁移
└── seed.ts                          # 种子入口（已有）

__tests__/
├── lib/
│   ├── epub-parser.test.ts          # EPUB 解析测试
│   ├── srs.test.ts                  # SRS 算法测试
│   └── dictionary.test.ts           # 词典服务测试
└── e2e/
    ├── shelf.spec.ts                # 书架端到端测试
    ├── reader.spec.ts               # 阅读器端到端测试
    └── vocabulary.spec.ts           # 生词本端到端测试
```

**结构决策**: 沿用单体项目结构（Option 1），保持 src/ 和 __tests__/ 在仓库根目录。路由组织遵循 Next.js App Router 约定，页面组件放置在 src/app/ 下，可复用组件按功能域放置在 src/components/ 下，服务层逻辑放置在 src/lib/ 下。

## 复杂度追踪

| 违规项 | 为何需要 | 被否决的更简方案及原因 |
|--------|---------|----------------------|
| AI 服务集成 | 翻译、词汇释义、章节梗概均需外部 LLM API | 纯本地方案无法提供高质量的文学翻译和词汇释义 |
| SRS 算法模块 | 间隔重复复习是词汇学习的核心差异化功能 | 简单的时间排序复习效果远不如 SM-2 算法 |
