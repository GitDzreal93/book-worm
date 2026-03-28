# BookWorm · 沉浸式小说阅读器

一款面向外语学习者的沉浸式小说阅读器。导入 epub 电子书，享受智能辅助阅读体验。

## 功能

- **EPUB 导入** — 上传 epub 文件，自动解析章节、封面、元数据
- **人物注释** — 人名高亮标注、悬停卡片、中文名/原文切换
- **家族关系图** — 人物关系可视化展示
- **双语翻译** — AI 驱动的段落级翻译，支持多 AI 后端
- **词汇学习** — 点击查词、生词本、SM-2 间隔重复复习
- **章节梗概** — AI 生成章节摘要
- **阅读标注** — 文字高亮、笔记、按章节组织
- **阅读统计** — 阅读时长追踪、趋势图、连续阅读天数

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Prisma 6 + PostgreSQL
- Tailwind CSS 4
- Vercel AI SDK (OpenAI / Anthropic / Google)
- Vitest + Playwright

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL

### 安装

```bash
npm install
```

### 配置

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/bookworm"
# 至少配置一个 AI 服务
OPENAI_API_KEY="sk-..."
# AI_PROVIDER="openai"  # 可选: openai | anthropic | google
```

### 数据库

```bash
npx prisma migrate dev
npm run db:seed
```

### 启动

```bash
npm run dev
```

打开 http://localhost:3000

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API 路由
│   ├── shelf/              # 书架页面
│   ├── read/[bookSlug]/    # 阅读器页面
│   ├── vocabulary/         # 生词本页面
│   ├── review/             # 复习页面
│   ├── notes/              # 笔记页面
│   └── stats/              # 统计页面
├── components/
│   ├── reader/             # 阅读器组件
│   ├── shelf/              # 书架组件
│   ├── sidebar/            # 侧边栏组件
│   ├── vocabulary/         # 词汇组件
│   ├── stats/              # 统计组件
│   └── layout/             # 布局组件
├── lib/
│   ├── ai-client.ts        # AI 客户端（多后端）
│   ├── srs.ts              # SM-2 间隔重复算法
│   ├── dictionary.ts       # 词典查询服务
│   ├── translate.ts        # 翻译服务
│   └── epub-parser.ts      # EPUB 解析器
└── prisma/
    └── schema.prisma       # 数据模型
```

## 测试

```bash
# 单元测试
npx vitest

# 端到端测试
npx playwright test
```

## 部署

支持部署到 Vercel 或任何支持 Node.js 的平台。确保设置 `DATABASE_URL` 和 AI 相关环境变量。
