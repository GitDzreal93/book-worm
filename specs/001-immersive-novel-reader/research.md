# 技术调研：沉浸式小说阅读器

**日期**: 2026-03-27
**分支**: `001-immersive-novel-reader`

## 1. EPUB 解析方案

### 决策

采用**服务端解析**方案：用户通过浏览器上传 epub 文件，服务端 API Route 接收文件并解析，提取元数据和章节内容后存入数据库。

### 技术选型

- **fflate**（npm：`fflate`）：高性能 ZIP 解压库，EPUB 本质是 ZIP 压缩包
- **cheerio**（已安装）：解析 EPUB 内的 XHTML 文档，提取段落文本
- **解析流程**：
  1. fflate 同步解压 epub 文件（`unzipSync`）
  2. 读取 `META-INF/container.xml` 定位 OPF 文件路径
  3. 解析 OPF 文件提取元数据（title、author、language）和 spine 阅读顺序
  4. 按 spine 顺序读取每个 XHTML 文件，用 cheerio（`xmlMode: true`）提取 `<body>` 内的文本
  5. 从 OPF 的 manifest 中定位封面图片，提取为 Buffer 转 Base64 存储

### 理由

- 服务端解析避免将整个 epub 文件传输到客户端后依赖浏览器 API
- cheerio 已在项目依赖中，无需引入额外的 HTML 解析库
- fflate 比 JSZip 更快、体积更小（浏览器包仅 8KB），且支持浏览器和 Node.js 同构运行
- fflate 无原生依赖（`epub2`/`epub` 包依赖 C++ addon `zipfile`，部署复杂）
- 解析后的数据存入数据库，后续访问无需重复解析

### 备选方案

| 方案 | 优点 | 缺点 | 否决原因 |
|------|------|------|---------|
| epub2 包 | 专为 epub 设计的 API | 8 年未更新，依赖 C++ addon `zipfile` | 原生依赖部署困难 |
| JSZip | 成熟的 ZIP 库 | 比 fflate 慢，体积更大 | fflate 性能更优且同构 |
| 客户端 JSZip + Web Worker | 不占用服务端资源 | 增加客户端 JS 体积，文件操作受限 | 与 App Router RSC 架构不匹配 |
| epubjs | 成熟的 epub 渲染库 | 功能过重，主要是渲染而非数据提取 | 我们需要的是数据导入而非电子书渲染 |

---

## 2. AI 翻译服务集成

### 决策

采用**可插拔 AI 客户端**架构：封装统一的 AI 调用接口，支持多种 LLM 后端（OpenAI、Anthropic Claude、Google Gemini），通过环境变量配置切换。

### 技术选型

- **AI SDK**（npm：`ai`，Vercel AI SDK）：统一的 LLM 调用接口，支持流式响应
- **批量翻译策略**：
  - 每次请求翻译一个段落（保证质量）
  - 前端触发翻译后，服务端按章节顺序逐段异步生成
  - 使用简单的内存队列（单用户场景无需 Redis）
  - 每完成一个段落的翻译立即写入数据库
  - 前端通过轮询 API 获取翻译进度
- **文学翻译 Prompt 模板**：
  - 提供书籍标题、作者和语言对作为上下文
  - 要求保持原文风格、语气和文化特色
  - 人名保持原文不翻译（与人物知识库配合）

### 理由

- Vercel AI SDK 已在 Next.js 生态中广泛验证，支持流式和非流式调用
- 可插拔设计允许用户使用自己偏好的 AI 服务
- 逐段翻译+即时持久化的策略确保不会因中断丢失已完成的翻译

### 备选方案

| 方案 | 优点 | 缺点 | 否决原因 |
|------|------|------|---------|
| 直接调用各厂商 SDK | 无抽象层开销 | 每个厂商 API 不同，维护成本高 | 违反宪法原则（DRY，提取共享逻辑） |
| 批量翻译多个段落 | 减少请求数 | 质量下降，失败回滚复杂 | 文学翻译质量优先 |
| 前端直接调用 AI API | 减少服务端负载 | API Key 暴露风险 | 安全风险不可接受 |

---

## 3. 词典查询服务

### 决策

采用**分层查询**策略：本地数据库缓存 → Wiktionary API → LLM 兜底。

### 技术选型

- **第一层：数据库缓存**：`VocabularyWord` 表按 `bookId + word` 唯一约束去重，已查过的词直接返回
- **第二层：Wiktionary API**（免费）：通过 Wiktionary 的 MediaWiki API 查询多语种释义，覆盖英语、西班牙语、法语等
- **第三层：LLM 兜底**（复用 AI 客户端）：当 Wiktionary 无结果时，使用 LLM 根据原文上下文提供精准释义
- **上下文感知**：查词时传入当前段落的上下文句子，LLM 可据此消歧（如 "bank" 的河岸/银行歧义）

### 理由

- 分层策略确保免费 API 优先，减少 LLM 调用成本
- Wiktionary 覆盖语种广（英语、西班牙语、法语等均有对应版本）
- LLM 兜底确保任何单词都能获得释义，且可根据上下文消歧
- 本地缓存确保重复查询零延迟、零成本

### 备选方案

| 方案 | 优点 | 缺点 | 否决原因 |
|------|------|------|---------|
| Free Dictionary API | 免费、快速 | 仅支持英语 | 不满足多语种需求 |
| 仅 LLM 查询 | 实现简单 | 每次查词都有 API 调用成本 | 分层策略可大幅降低成本 |
| 预装离线词典 | 零延迟 | 体积大，语种覆盖有限 | 部署和更新困难 |

---

## 4. SRS 间隔重复算法

### 决策

实现 **SM-2 算法**（SuperMemo 2），这是最广泛使用的间隔重复算法。

### 算法核心逻辑

```
输入：单词的当前评分 q（0-5，用户自评掌握程度）
输出：更新后的 easeFactor、interval、nextReviewDate

if q >= 3:  // 回答正确
  if 复习次数 == 0:
    interval = 1  // 1 天后复习
  elif 复习次数 == 1:
    interval = 6  // 6 天后复习
  else:
    interval = round(interval * easeFactor)
  easeFactor = max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
else:  // 回答错误
  复习次数 = 0
  interval = 1
  easeFactor = easeFactor  // 不变

nextReviewDate = today + interval 天
```

### 数据存储

在 ReviewLog 表中记录每次复习的结果，VocabularyWord 表中存储计算后的下次复习日期和间隔参数。

### 理由

- SM-2 算法简单、经过验证，实现约 30 行 TypeScript 代码
- 被Anki 等主流 SRS 应用广泛使用
- 单用户场景下无需复杂的分布式调度

### 备选方案

| 方案 | 优点 | 缺点 | 否决原因 |
|------|------|------|---------|
| FSRS 算法 | 更精确 | 实现复杂度高，需更多数据 | 单用户小数据集优势不明显 |
| Leitner 盒子 | 实现最简单 | 精度较低 | 用户体验不如 SM-2 |
| 第三方 SRS 库 | 开箱即用 | 增加外部依赖 | 核心逻辑自行实现更可控 |

---

## 5. 文件上传与处理

### 决策

采用 **Next.js API Route + FormData** 接收文件上传。

### 技术选型

- 前端使用 `<input type="file">` + 拖放区域
- 通过 `FormData` 将文件发送到 `POST /api/books/import`
- 服务端设置合理的文件大小限制（50MB）
- 使用 Next.js 的 App Router Route Handler 处理请求

### 理由

- FormData 是浏览器标准 API，无需额外依赖
- 服务端处理确保解析逻辑的安全性和一致性
- 50MB 限制覆盖绝大多数 epub 文件（通常 < 10MB）

---

## 6. 阅读进度持久化

### 决策

在 Book 模型中新增 `currentChapterId` 和 `currentParagraphOrder` 字段，记录阅读位置。通过 API 在用户离开页面或滚动时更新。

### 技术选型

- 使用 `beforeunload` 事件和 `visibilitychange` 事件保存进度
- 使用 debounce（3 秒延迟）避免频繁写入
- 服务端提供 `PUT /api/books/[bookSlug]/progress` 接口

### 理由

- 简单直接，不需要额外的前后端实时同步机制
- debounce 确保性能不受影响
- 精确到段落级别满足 SC-008 要求
