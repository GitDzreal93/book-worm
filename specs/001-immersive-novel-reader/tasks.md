# 任务清单：沉浸式小说阅读器

**输入**: 来自 `specs/001-immersive-novel-reader/` 的设计文档
**前置条件**: plan.md（必需）、spec.md（必需）、data-model.md、contracts/api-routes.md、research.md

**测试**: 宪法原则二要求所有新功能必须包含单元测试（新增代码 80% 覆盖率）。单元测试与各用户故事内联编写，端到端测试在阶段 9 统一执行。

**组织方式**: 任务按用户故事分组，以实现每个故事的独立实现和测试。

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 此任务属于哪个用户故事（如 US1、US2、US3）
- 描述中需包含确切文件路径

## 路径约定

- 单体项目: `src/`、`__tests__/` 在仓库根目录

---

## 阶段 1：基础搭建（共享基础设施）

**目的**: 安装新依赖、扩展数据模型、创建共享工具模块

- [x] T001 安装新依赖：`fflate`（epub 解压）、`ai` + `@ai-sdk/openai`（AI 服务）
- [x] T002 扩展 Prisma schema：在 `prisma/schema.prisma` 中新增 Book 字段（coverImage、language、description、totalChapters、totalParagraphs、currentChapterId、currentParagraphOrder、readPercentage）、Chapter.summary 字段
- [x] T003 执行数据库迁移 `npx prisma migrate dev --name expanded-schema`，为新增字段创建迁移
- [x] T004 在 `src/lib/types.ts` 中扩展类型定义：新增 BookData、ParagraphTranslationData、VocabularyWordData、ReviewLogData、HighlightData、ReadingSessionData 类型
- [x] T005 更新 `src/app/page.tsx` 首页：从硬编码重定向改为重定向到 `/shelf`

**检查点**: 基础设施就绪——用户故事实现可以开始

---

## 阶段 2：用户故事 1 - 导入并阅读一本小说 (优先级: P1) 🎯 MVP

**目标**: 读者可以上传 epub 文件、在书架查看书籍、打开阅读并自动保存进度

**独立测试**: 上传 epub → 书架显示 → 点击进入阅读 → 关闭后重新打开恢复进度

### 实现用户故事 1

- [x] T006 [P] [US1] 实现 EPUB 解析器核心逻辑 `src/lib/epub-parser.ts`：使用 fflate 解压、cheerio 解析 OPF 元数据和 XHTML 章节、提取封面图片为 base64
- [x] T007 [P] [US1] 创建书架 API `src/app/api/books/route.ts`：GET 返回所有书籍列表（含阅读进度百分比）
- [x] T008 [US1] 创建 epub 导入 API `src/app/api/books/import/route.ts`：POST 接收 FormData 文件、调用 epub-parser 解析、创建 Book/Chapter/Paragraph 记录，含文件格式验证和大小限制（50MB）
- [x] T009 [P] [US1] 创建单本书籍 API `src/app/api/books/[bookSlug]/route.ts`：GET 返回书籍详情，DELETE 级联删除所有关联数据
- [x] T010 [P] [US1] 创建书架页面 `src/app/shelf/page.tsx`：服务端组件，获取书籍列表并渲染
- [x] T011 [P] [US1] 创建书籍卡片组件 `src/components/shelf/BookCard.tsx`：显示封面缩略图、标题、作者、阅读进度
- [x] T012 [US1] 创建书籍网格组件 `src/components/shelf/BookGrid.tsx`：响应式网格布局排列 BookCard
- [x] T013 [P] [US1] 创建导入对话框组件 `src/components/shelf/ImportDialog.tsx`：拖放区域 + 文件选择按钮
- [x] T013b [US1] 实现 ImportDialog 的完整状态（`src/components/shelf/ImportDialog.tsx`）：上传中进度条、文件格式错误提示、文件过大提示（>50MB）、解析失败提示
- [x] T014 [US1] 重构阅读页面 `src/app/read/[bookSlug]/page.tsx`：支持任意书籍（移除硬编码的百年孤独依赖），服务端按 bookSlug 查询并传递数据
- [x] T015 [P] [US1] 创建阅读进度 API `src/app/api/books/[bookSlug]/progress/route.ts`：GET 获取进度、PUT 更新进度（精确到段落）
- [x] T016 [US1] 在 `src/app/read/[bookSlug]/ReaderLayoutClient.tsx` 中实现阅读进度追踪：使用 visibilitychange 事件 + 3 秒 debounce 自动保存进度，页面加载时恢复到上次位置
- [ ] T016b [P] [US1] 在 `__tests__/lib/` 下创建 `epub-parser.test.ts`：测试 EPUB 解析器核心逻辑（元数据提取、章节解析、封面提取）

**检查点**: 此时，用户故事 1 应完全可用——可导入任意 epub、在书架浏览、进入阅读、进度自动保存和恢复

---

## 阶段 3：用户故事 2 - 人物识别与关系追踪 (优先级: P1)

**目标**: 扩展现有人物系统，支持名称变体，保持现有标注/悬停/固定/切换/家族树功能

**独立测试**: 打开含人物数据的书籍，验证人名标注、悬停卡片、点击固定、人名切换、家族关系图谱

### 实现用户故事 2

- [x] T017 [US2] 在 `prisma/schema.prisma` 中新增 CharacterAlias 模型：alias、isPrimary 字段，唯一约束 [characterId, alias]
- [x] T018 [US2] 修改 CharacterMention 模型：将 characterId/character 关系改为 characterAliasId/characterAlias 关系
- [x] T019 [US2] 执行数据库迁移 `npx prisma migrate dev --name character-aliases`，并编写数据迁移脚本将现有 CharacterMention 的 characterId 迁移为默认 CharacterAlias 的 id
- [x] T020 [P] [US2] 更新 `src/lib/types.ts`：新增 CharacterAliasData 类型，修改 CharacterMentionData 引用 CharacterAlias
- [x] T021 [P] [US2] 更新人物 API `src/app/api/books/[bookSlug]/characters/route.ts`：查询时 include CharacterAlias，返回人物及其名称变体列表
- [x] T022 [US2] 更新 `src/seed/seed.ts`：在创建 Character 时同时创建对应的 CharacterAlias 记录（nick 为 primary alias，orig 为第二个 alias）
- [x] T023 [US2] 更新 `src/components/reader/AnnotatedText.tsx`：适配 CharacterAlias 数据结构，人名标注使用 alias 文本进行匹配和着色

**检查点**: 用户故事 1 和 2 均可独立运行，人物追踪功能增强后与现有 UI 完美集成

---

## 阶段 4：用户故事 3 - 双语对照阅读 (优先级: P2)

**目标**: 读者可开启翻译模式查看段落级译文，支持触发翻译、查看进度、手动编辑

**独立测试**: 开启翻译模式 → 触发翻译 → 查看译文 → 编辑译文 → 关闭翻译模式

### 实现用户故事 3

- [x] T024 [P] [US3] 在 `prisma/schema.prisma` 中新增 ParagraphTranslation 模型：paragraphId（unique）、content、isEdited
- [x] T025 [US3] 执行数据库迁移 `npx prisma migrate dev --name paragraph-translations`
- [x] T026 [P] [US3] 创建 AI 客户端 `src/lib/ai-client.ts`：封装 Vercel AI SDK 的 generateText，支持通过环境变量切换 provider（openai/anthropic/google）
- [x] T027 [US3] 创建翻译服务 `src/lib/translate.ts`：实现逐段翻译逻辑、并发控制（3 路并发）、进度追踪（内存队列）、翻译完成后写入 ParagraphTranslation
- [x] T028 [P] [US3] 创建翻译 API `src/app/api/translate/route.ts`：POST 触发翻译任务、GET 返回翻译进度
- [x] T029 [P] [US3] 创建章节翻译查询 API `src/app/api/books/[bookSlug]/chapters/[chapterNumber]/translation/route.ts`：GET 返回指定章节所有段落的翻译数据
- [x] T030 [US3] 创建翻译编辑 API `src/app/api/paragraphs/[paragraphId]/translation/route.ts`：PUT 更新翻译内容并标记 isEdited
- [x] T031 [US3] 创建翻译面板组件 `src/components/reader/TranslationPanel.tsx`：在侧边栏新增"翻译"标签，显示翻译进度、手动触发翻译按钮
- [x] T032 [US3] 更新 `src/components/reader/ChapterSection.tsx`：翻译模式开启时，在每个段落的 AnnotatedText 下方显示对应的翻译文本（从 ParagraphTranslation 加载）
- [x] T032b [US3] 实现翻译模式的降级状态（`src/components/reader/ChapterSection.tsx`）：未翻译段落显示"暂无翻译"占位、翻译生成中显示加载动画、翻译失败显示重试按钮
- [x] T033 [US3] 更新 `src/components/sidebar/SidebarTabs.tsx`：新增"翻译"标签页

**检查点**: 用户故事 3 可独立测试——可触发翻译、查看进度、在阅读中显示译文、编辑译文

---

## 阶段 5：用户故事 4 - 智能词汇学习 (优先级: P2)

**目标**: 点击外文单词查看释义、自动加入生词本、基于 SM-2 算法的 SRS 复习

**独立测试**: 点击单词 → 弹出释义卡 → 生词本中新增 → 复习页面展示待复习词

### 实现用户故事 4

- [x] T034 [P] [US4] 在 `prisma/schema.prisma` 中新增 VocabularyWord 和 ReviewLog 模型（按 data-model.md 定义）
- [x] T035 [US4] 执行数据库迁移 `npx prisma migrate dev --name vocabulary`
- [x] T036 [P] [US4] 实现 SRS 算法 `src/lib/srs.ts`：SM-2 核心逻辑（processReview、isDue、sortByPriority），约 30 行 TypeScript
- [x] T037 [P] [US4] 实现词典查询服务 `src/lib/dictionary.ts`：分层查询（数据库缓存 → Wiktionary API → LLM 兜底），支持上下文消歧
- [x] T038 [US4] 创建查词 API `src/app/api/vocabulary/route.ts`：POST 查词释义（调用 dictionary 服务）并自动创建 VocabularyWord，GET 返回生词列表（支持分页、排序、搜索）
- [x] T039 [US4] 创建复习 API `src/app/api/vocabulary/review/route.ts`：GET 返回待复习单词（nextReviewDate <= now），POST 提交复习结果（调用 SRS 算法更新 nextReviewDate）
- [x] T040 [P] [US4] 创建词汇释义弹窗 `src/components/reader/WordTooltip.tsx`：点击外文单词弹出释义卡片（词性、释义、音标、例句），含"加入生词本"按钮
- [x] T040b [P] [US4] 实现 WordTooltip 的完整状态（`src/components/reader/WordTooltip.tsx`）：查询中加载动画、未找到释义提示、网络错误重试
- [x] T041 [P] [US4] 创建生词本页面 `src/app/vocabulary/page.tsx`：展示生词列表，支持按时间/字母/章节排序和搜索
- [x] T042 [P] [US4] 创建生词卡片组件 `src/components/vocabulary/WordCard.tsx`：显示单词、释义、词性、所在章节
- [x] T043 [US4] 创建复习页面 `src/app/review/page.tsx`：逐个展示待复习单词，用户回忆释义后翻转显示正确答案，提交自评分数
- [x] T044 [P] [US4] 创建复习卡片组件 `src/components/vocabulary/ReviewCard.tsx`：正反面翻转卡片，正面显示单词和上下文，反面显示释义
- [x] T045 [P] [US4] 创建复习控制按钮组件 `src/components/vocabulary/ReviewControls.tsx`：5 级评分按钮（不认识/模糊/熟悉/掌握/完美）
- [x] T045b [P] [US4] 在 `__tests__/lib/` 下创建 `srs.test.ts`：测试 SM-2 算法（评分计算、间隔递增、easeFactor 边界）
- [x] T045c [P] [US4] 在 `__tests__/lib/` 下创建 `dictionary.test.ts`：测试词典分层查询逻辑（缓存命中、Wiktionary 回退、LLM 兜底）

**检查点**: 用户故事 4 可独立测试——查词、生词本、SRS 复习全流程可用

---

## 阶段 6：用户故事 5 - 章节梗概与全书概要 (优先级: P3)

**目标**: AI 生成章节梗概，在章节标题下展示

**独立测试**: 触发梗概生成 → 章节标题下显示 2-3 句话梗概 → 书籍详情页显示全书概要

### 实现用户故事 5

- [x] T046 [US5] 创建梗概 API `src/app/api/summaries/route.ts`：POST 触发 AI 生成指定章节的梗概并写入 Chapter.summary，GET 返回所有章节梗概
- [x] T047 [US5] 更新 `src/components/reader/ChapterSection.tsx`：章节标题下方展示 Chapter.summary 内容（如非空）
- [x] T048 [US5] 更新 `src/components/shelf/BookCard.tsx`：点击书籍卡片时弹出详情面板，显示 Book.description（全书概要）

**检查点**: 用户故事 5 可独立测试

---

## 阶段 7：用户故事 6 - 阅读标注与笔记 (优先级: P3)

**目标**: 选中文字添加高亮和笔记，在笔记面板中浏览和搜索

**独立测试**: 选中文字 → 添加高亮 → 添加笔记 → 笔记面板查看 → 点击跳转到对应位置

### 实现用户故事 6

- [x] T049 [US6] 在 `prisma/schema.prisma` 中新增 Highlight 模型（paragraphId、bookId、startOffset、endOffset、color、note）
- [x] T050 [US6] 执行数据库迁移 `npx prisma migrate dev --name highlights`
- [x] T051 [US6] 创建高亮 API `src/app/api/highlights/route.ts`：POST 创建、GET 查询（按 bookSlug + chapterNumber 筛选）、PUT 更新、DELETE 删除
- [x] T052 [P] [US6] 创建高亮工具栏组件 `src/components/reader/HighlightToolbar.tsx`：文字选中后弹出浮动工具栏，支持选择颜色和添加笔记
- [x] T053 [US6] 创建笔记面板组件 `src/components/sidebar/NotesPanel.tsx`：按章节组织展示所有高亮标注，支持搜索，点击跳转到正文位置
- [x] T054 [US6] 创建笔记页面 `src/app/notes/page.tsx`：独立页面展示所有书籍的笔记列表
- [x] T055 [US6] 更新 `src/components/sidebar/SidebarTabs.tsx`：新增"笔记"标签页
- [x] T056 [US6] 更新 `src/components/reader/AnnotatedText.tsx`：渲染时将已保存的高亮标注以对应颜色底色显示

**检查点**: 用户故事 6 可独立测试

---

## 阶段 8：用户故事 7 - 阅读统计与成就 (优先级: P3)

**目标**: 自动追踪阅读时长和进度，在仪表盘展示统计数据和趋势

**独立测试**: 阅读一段时间 → 打开统计页面 → 查看今日阅读时长、累计数据、趋势图表

### 实现用户故事 7

- [x] T057 [P] [US7] 在 `prisma/schema.prisma` 中新增 ReadingSession 模型（bookId、startedAt、endedAt、chaptersRead、paragraphsRead）
- [x] T058 [US7] 执行数据库迁移 `npx prisma migrate dev --name reading-sessions`
- [x] T059 [US7] 创建统计 API `src/app/api/stats/route.ts`：GET 返回累计统计数据（总书籍数、完成书籍数、总阅读时长、总字数、已学生词数）和每日统计（按日期聚合）
- [x] T060 [US7] 更新 `src/app/read/[bookSlug]/ReaderLayoutClient.tsx`：在已有的进度保存逻辑中同时创建/更新 ReadingSession 记录
- [x] T061 [P] [US7] 创建统计仪表盘页面 `src/app/stats/page.tsx`：展示统计概览卡片（总书籍、阅读时长、生词数等）
- [x] T062 [P] [US7] 创建阅读趋势图组件 `src/components/stats/ReadingChart.tsx`：使用 CSS 或轻量图表库展示每日/每周阅读时长变化
- [x] T062b [P] [US7] 实现统计仪表盘的空状态（`src/app/stats/page.tsx`）：首次使用时显示引导提示而非空白页面

**检查点**: 用户故事 7 可独立测试

---

## 阶段 9：收尾与跨切面关注点

**目的**: 完善用户体验、执行端到端测试、优化性能

- [x] T063 创建导航菜单组件：在 `src/app/layout.tsx` 中添加全局导航（书架、生词本、复习、统计入口）
- [x] T064 [P] 响应式布局验证：检查所有新增页面（shelf、vocabulary、review、notes、stats）在三个断点（<640px / 640-1024px / >1024px）下布局正确、无溢出、触控目标 >= 44px
- [x] T065 配置 Vitest：创建 `vitest.config.ts`，配置测试环境
- [x] T066 配置 Playwright：创建 `playwright.config.ts`，确认测试浏览器可用
- [x] T067 [P] 在 `__tests__/e2e/` 下创建 `shelf.spec.ts`：端到端测试书架页面加载和书籍导入流程
- [x] T068 [P] 在 `__tests__/e2e/` 下创建 `reader.spec.ts`：端到端测试阅读器核心交互（目录跳转、人名悬停、进度保存）
- [x] T069 更新 `docs/quickstart.md` 或项目 README.md：反映新增功能和 API

---

## 依赖与执行顺序

### 阶段依赖

- **基础搭建（阶段 1）**: 无依赖——可立即开始
- **用户故事 1（阶段 2）**: 依赖阶段 1 完成——BLOCKS 阶段 3
- **用户故事 2（阶段 3）**: 依赖阶段 1 完成（需要数据库迁移）——可与阶段 2 顺序执行
- **用户故事 3（阶段 4）**: 依赖阶段 1 完成——可与阶段 2、3 并行
- **用户故事 4（阶段 5）**: 依赖阶段 1 完成——可与阶段 3、4 并行
- **用户故事 5（阶段 6）**: 依赖阶段 4（需要 AI 客户端）
- **用户故事 6（阶段 7）**: 依赖阶段 1 完成——可与阶段 3-5 并行
- **用户故事 7（阶段 8）**: 依赖阶段 1 完成——可与阶段 3-6 并行
- **收尾（阶段 9）**: 依赖所有用户故事完成

### 用户故事依赖

- **用户故事 1 (P1)**: 阶段 1 完成后即可开始——无其他故事依赖
- **用户故事 2 (P1)**: 阶段 1 完成后即可开始——与 US1 顺序执行（两者共享数据库结构）
- **用户故事 3 (P2)**: 阶段 1 完成后即可开始——独立于 US1/US2 的核心逻辑
- **用户故事 4 (P2)**: 阶段 1 完成后即可开始——独立于 US1-3
- **用户故事 5 (P3)**: 需 US3 的 AI 客户端——可与 US4 并行
- **用户故事 6 (P3)**: 阶段 1 完成后即可开始——独立于 US1-5
- **用户故事 7 (P3)**: 阶段 1 完成后即可开始——独立于 US1-6

### 每个用户故事内部

- 数据模型变更 → 数据库迁移 → API 路由 → UI 组件 → 集成测试

### 并行机会

- 阶段 1 内的 T002-T005 可并行（不同文件）
- T006-T009、T010-T013、T015-T016b 可并行（不同文件）
- T017-T020、T021 可并行
- T024-T027、T028-T030 可并行
- T034-T037 可并行（SRS 算法、词典服务、数据模型独立）
- T038-T039、T040-T045c 可并行（API 与组件分离）
- T046、T047-T048 可并行
- T049-T051、T052-T056 可并行
- T057-T062b 可并行
- T067-T068 可并行（端到端测试独立）

---

## 实现策略

### MVP 优先（仅用户故事 1 + 2）

1. 完成阶段 1：基础搭建
2. 完成阶段 2：用户故事 1（导入 + 阅读 + 进度）
3. 完成阶段 3：用户故事 2（人物增强 + 名称变体）
4. **停止并验证**: 测试 epub 导入、阅读、进度保存、人物追踪
5. 部署/演示

### 增量交付

1. 基础搭建 + US1 → 基础阅读器 MVP
2. + US2 → 人物追踪增强
3. + US3 → 双语阅读
4. + US4 → 词汇学习
5. + US5-US7 → 梗概、标注、统计
6. 每个增量独立可测试和演示

### 并行团队策略

如有多人开发：

1. 团队共同完成阶段 1
2. 阶段 1 完成后：
   - 开发者 A：阶段 2（US1）
   - 开发者 B：阶段 4（US3，仅依赖阶段 1）
   - 开发者 C：阶段 5（US4，仅依赖阶段 1）
3. US1 完成后：
   - 开发者 A：阶段 3（US2）
   - 开发者 B/C 继续 US3/US4
4. US2 完成后：
   - 开发者 D：阶段 6-8（US5-US7）
