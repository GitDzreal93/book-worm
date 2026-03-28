# API 接口契约：沉浸式小说阅读器

**日期**: 2026-03-27
**分支**: `001-immersive-novel-reader`

## 书籍管理

### `GET /api/books`

获取所有书籍列表（书架）。

**响应**:
```json
{
  "books": [
    {
      "id": "string",
      "slug": "string",
      "title": "string",
      "subtitle": "string | null",
      "author": "string | null",
      "language": "string | null",
      "description": "string | null",
      "coverImage": "string (base64) | null",
      "totalChapters": "number",
      "readPercentage": "number",
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```

### `POST /api/books/import`

上传并导入 epub 文件。

**请求**: `multipart/form-data`，字段 `file` 为 epub 文件。

**响应** (201):
```json
{
  "id": "string",
  "slug": "string",
  "title": "string",
  "author": "string | null",
  "totalChapters": "number",
  "totalParagraphs": "number"
}
```

**错误响应** (400):
```json
{ "error": "不支持的文件格式，请上传 epub 文件" }
```

### `GET /api/books/[bookSlug]`

获取单本书籍详情。

**响应**: 同 `GET /api/books` 中的单个书籍对象。

### `DELETE /api/books/[bookSlug]`

删除书籍及其所有关联数据。

**响应** (200):
```json
{ "deleted": true }
```

---

## 阅读进度

### `GET /api/books/[bookSlug]/progress`

获取当前阅读进度。

**响应**:
```json
{
  "chapterId": "string | null",
  "paragraphOrder": "number | null",
  "readPercentage": "number"
}
```

### `PUT /api/books/[bookSlug]/progress`

更新阅读进度。

**请求体**:
```json
{
  "chapterId": "string",
  "paragraphOrder": "number"
}
```

**响应** (200):
```json
{
  "chapterId": "string",
  "paragraphOrder": "number",
  "readPercentage": "number"
}
```

---

## 章节与内容

### `GET /api/books/[bookSlug]/chapters`

获取所有章节及段落。已存在，保持不变。

### `GET /api/books/[bookSlug]/characters`

获取所有人物。已存在，保持不变。

### `GET /api/books/[bookSlug]/family-tree`

获取家族关系。已存在，保持不变。

---

## 翻译

### `POST /api/translate`

触发翻译任务。

**请求体**:
```json
{
  "bookSlug": "string",
  "chapterNumbers": "number[] (可选，默认翻译全部章节)"
}
```

**响应** (202):
```json
{
  "taskId": "string",
  "totalParagraphs": "number",
  "status": "processing"
}
```

### `GET /api/translate?bookSlug=xxx`

获取翻译进度。

**响应**:
```json
{
  "status": "processing | completed | idle",
  "translated": "number",
  "total": "number",
  "percentage": "number"
}
```

### `GET /api/books/[bookSlug]/chapters/[chapterNumber]/translation`

获取指定章节的翻译数据。

**响应**:
```json
{
  "paragraphs": [
    { "paragraphId": "string", "translation": "string | null" }
  ]
}
```

### `PUT /api/paragraphs/[paragraphId]/translation`

手动编辑翻译。

**请求体**:
```json
{
  "content": "string"
}
```

**响应** (200):
```json
{ "id": "string", "content": "string", "isEdited": true }
```

---

## 词汇学习

### `POST /api/vocabulary`

查询单词释义（同时加入生词本）。

**请求体**:
```json
{
  "bookSlug": "string",
  "word": "string",
  "contextSentence": "string (可选)"
}
```

**响应** (200):
```json
{
  "id": "string",
  "word": "string",
  "definition": "string",
  "partOfSpeech": "string | null",
  "phonetic": "string | null",
  "contextSentence": "string | null"
}
```

### `GET /api/vocabulary?bookSlug=xxx&sort=recent|alpha|chapter&page=1&limit=20`

获取生词列表。

**响应**:
```json
{
  "words": [
    {
      "id": "string",
      "word": "string",
      "definition": "string",
      "partOfSpeech": "string | null",
      "chapterTitle": "string | null",
      "nextReviewDate": "string | null",
      "createdAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### `GET /api/vocabulary/review?bookSlug=xxx`

获取待复习单词列表。

**响应**:
```json
{
  "words": [
    {
      "id": "string",
      "word": "string",
      "definition": "string (隐藏，待用户回答后展示)",
      "contextSentence": "string | null",
      "repetitionCount": "number"
    }
  ]
}
```

### `POST /api/vocabulary/review`

提交复习结果。

**请求体**:
```json
{
  "wordId": "string",
  "quality": "number (0-5)"
}
```

**响应** (200):
```json
{
  "id": "string",
  "nextReviewDate": "string",
  "interval": "number",
  "easeFactor": "number"
}
```

---

## 章节梗概

### `POST /api/summaries`

生成章节梗概。

**请求体**:
```json
{
  "bookSlug": "string",
  "chapterNumbers": "number[]"
}
```

**响应** (202):
```json
{ "status": "processing", "taskId": "string" }
```

### `GET /api/summaries?bookSlug=xxx`

获取所有章节梗概。

**响应**:
```json
{
  "summaries": [
    { "chapterId": "string", "chapterNumber": "number", "summary": "string | null" }
  ]
}
```

---

## 高亮标注

### `POST /api/highlights`

创建高亮标注。

**请求体**:
```json
{
  "bookSlug": "string",
  "paragraphId": "string",
  "startOffset": "number",
  "endOffset": "number",
  "color": "string (默认 yellow)",
  "note": "string (可选)"
}
```

**响应** (201):
```json
{ "id": "string", "color": "string", "note": "string | null" }
```

### `GET /api/highlights?bookSlug=xxx&chapterNumber=1`

获取标注列表。

**响应**:
```json
{
  "highlights": [
    {
      "id": "string",
      "paragraphId": "string",
      "startOffset": "number",
      "endOffset": "number",
      "color": "string",
      "note": "string | null",
      "chapterNumber": "number",
      "chapterTitle": "string"
    }
  ]
}
```

### `PUT /api/highlights/[id]`

更新标注（修改颜色或笔记）。

**请求体**:
```json
{ "color": "string", "note": "string | null" }
```

### `DELETE /api/highlights/[id]`

删除标注。

**响应** (200):
```json
{ "deleted": true }
```

---

## 阅读统计

### `GET /api/stats`

获取阅读统计数据。

**响应**:
```json
{
  "totalBooks": "number",
  "completedBooks": "number",
  "totalReadingTimeMinutes": "number",
  "totalWordsRead": "number",
  "totalVocabularyWords": "number",
  "dailyStats": [
    {
      "date": "string (YYYY-MM-DD)",
      "readingTimeMinutes": "number",
      "paragraphsRead": "number",
      "wordsLearned": "number"
    }
  ]
}
```
