# 数据模型：沉浸式小说阅读器

**日期**: 2026-03-27
**分支**: `001-immersive-novel-reader`

## 概述

基于现有的 6 个 Prisma 模型（Book、Chapter、Paragraph、Character、CharacterMention、FamilyRelation）进行扩展，新增 6 个模型，并修改 2 个现有模型。

## 现有模型变更

### Book（修改）

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `coverImage` | `Bytes?` | 封面图片二进制数据（从 epub 提取） |
| `language` | `String?` | 书籍语言代码（如 "es"、"en"、"fr"） |
| `description` | `String?` | 全书概要（梗概） |
| `totalChapters` | `Int` | 总章节数（便于书架展示） |
| `totalParagraphs` | `Int` | 总段落数 |
| `currentChapterId` | `String?` | 当前阅读到的章节 ID |
| `currentParagraphOrder` | `Int?` | 当前阅读到的段落排序号 |
| `readPercentage` | `Float` | 阅读进度百分比（0-100） |

### Character（修改）

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `aliases` | `CharacterAlias[]` | 关联的名称变体 |

### CharacterMention（修改）

变更关联：从直接关联 `Character` 改为关联 `CharacterAlias`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `characterAliasId` | `String` | 替代原有的 `characterId` |
| `characterAlias` | `CharacterAlias` | 关联的名称变体 |

> 注：保持向后兼容——现有种子数据中 `characterId` 将迁移为默认变体的 `characterAliasId`。

## 新增模型

### CharacterAlias（人物名称变体）

人物在原文中出现的不同写法。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `characterId` | `String` | FK → Character | 所属人物 |
| `character` | `Character` | 关系 | 反向关联 |
| `alias` | `String` | - | 名称变体文本（如 "Colonel Aureliano"） |
| `isPrimary` | `Boolean` | default: false | 是否为主要显示名称（nick 为主要时设为 true） |
| `createdAt` | `DateTime` | default: now() | 创建时间 |
| `updatedAt` | `DateTime` | @updatedAt | 更新时间 |

**索引**: `[characterId]`, `[characterId, alias]`（唯一约束）
**关联**: `mentions CharacterMention[]`

### ParagraphTranslation（段落翻译）

段落的翻译文本。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `paragraphId` | `String` | FK → Paragraph, unique | 关联段落（一对一） |
| `paragraph` | `Paragraph` | 关系, onDelete: Cascade | 反向关联 |
| `content` | `String` | - | 翻译文本 |
| `isEdited` | `Boolean` | default: false | 是否为用户手动编辑 |
| `createdAt` | `DateTime` | default: now() | 创建时间 |
| `updatedAt` | `DateTime` | @updatedAt | 更新时间 |

### VocabularyWord（生词）

用户学习的单词。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `bookId` | `String` | FK → Book | 所属书籍 |
| `book` | `Book` | 关系, onDelete: Cascade | 反向关联 |
| `word` | `String` | - | 外文单词 |
| `definition` | `String` | - | 中文释义 |
| `partOfSpeech` | `String?` | - | 词性 |
| `phonetic` | `String?` | - | 音标 |
| `contextSentence` | `String?` | - | 首次出现的原文句子 |
| `chapterTitle` | `String?` | - | 所在章节标题 |
| `easeFactor` | `Float` | default: 2.5 | SM-2 难度因子 |
| `interval` | `Int` | default: 0 | 当前复习间隔（天） |
| `repetitionCount` | `Int` | default: 0 | 已复习次数 |
| `nextReviewDate` | `DateTime?` | - | 下次复习日期 |
| `createdAt` | `DateTime` | default: now() | 加入生词本的时间 |
| `updatedAt` | `DateTime` | @updatedAt | 更新时间 |

**索引**: `[bookId]`, `[bookId, word]`（唯一约束）
**关联**: `reviewLogs ReviewLog[]`

### ReviewLog（复习记录）

每次复习的记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `wordId` | `String` | FK → VocabularyWord | 关联生词 |
| `word` | `VocabularyWord` | 关系, onDelete: Cascade | 反向关联 |
| `quality` | `Int` | - | 用户自评分数（0=不认识, 3=模糊, 5=掌握） |
| `reviewedAt` | `DateTime` | default: now() | 复习时间 |

**索引**: `[wordId]`, `[wordId, reviewedAt]`

### Highlight（高亮标注）

用户在正文中的高亮标记。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `paragraphId` | `String` | FK → Paragraph | 关联段落 |
| `paragraph` | `Paragraph` | 关系, onDelete: Cascade | 反向关联 |
| `bookId` | `String` | FK → Book | 所属书籍（冗余，便于按书查询） |
| `startOffset` | `Int` | - | 高亮起始偏移量 |
| `endOffset` | `Int` | - | 高亮结束偏移量 |
| `color` | `String` | default: "yellow" | 高亮颜色 |
| `note` | `String?` | - | 附加笔记 |
| `createdAt` | `DateTime` | default: now() | 创建时间 |
| `updatedAt` | `DateTime` | @updatedAt | 更新时间 |

**索引**: `[paragraphId]`, `[bookId]`

### ReadingSession（阅读记录）

一次阅读活动。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `String` | PK, cuid | 主键 |
| `bookId` | `String` | FK → Book | 关联书籍 |
| `book` | `Book` | 关系, onDelete: Cascade | 反向关联 |
| `startedAt` | `DateTime` | default: now() | 开始时间 |
| `endedAt` | `DateTime?` | - | 结束时间 |
| `chaptersRead` | `Int` | default: 0 | 本次阅读的章节数 |
| `paragraphsRead` | `Int` | default: 0 | 本次阅读的段落数 |

**索引**: `[bookId]`, `[bookId, startedAt]`

## Chapter 模型变更

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary` | `String?` | 章节梗概 |

## 实体关系图

```
Book ──┬── Chapter ──── Paragraph ──┬── CharacterMention ── CharacterAlias ── Character
       │                            ├── ParagraphTranslation
       │                            └── Highlight
       ├── Character ──┬── CharacterAlias
       │               └── FamilyRelation ── Character (self-ref)
       ├── FamilyRelation
       ├── VocabularyWord ── ReviewLog
       └── ReadingSession
```
