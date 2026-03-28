# API 契约：LLM 设置接口

**功能分支**: `002-llm-settings`
**日期**: 2026-03-28

## 1. GET /api/settings

获取当前所有 AI 设置。

**响应**:

```json
{
  "settings": {
    "default_provider": "openai",
    "default_model": "gpt-4o-mini",
    "temperature": "1",
    "max_tokens": "4096",
    "openai_api_key": "sk-****abcd",
    "anthropic_api_key": null,
    "google_api_key": null,
    "prompt_translate": "你是专业的文学翻译家...",
    "prompt_dictionary": "你是专业的英语词典...",
    "prompt_summary": "你是一位文学评论家..."
  }
}
```

**说明**:
- 所有已配置的键值对都会返回
- API Key 以掩码形式返回（前 4 位 + `****` + 后 4 位），不暴露完整值
- 未配置的键值为 `null`

---

## 2. PUT /api/settings

批量更新 AI 设置。

**请求体**:

```json
{
  "default_provider": "openai",
  "default_model": "gpt-4o",
  "temperature": "0.7",
  "max_tokens": "2048",
  "prompt_translate": "自定义翻译提示词..."
}
```

**响应**:

```json
{
  "updated": ["default_provider", "default_model", "temperature", "max_tokens", "prompt_translate"]
}
```

**规则**:
- 仅更新请求体中包含的键
- API Key 不能通过此端点更新（必须使用专门的验证流程）
- 值类型统一为字符串（温度 `0.7` 而非 `0.7` number）
- 参数校验：temperature 必须在 0-2 之间，max_tokens 必须为正整数

**错误响应**:

| 状态码 | 条件 |
|--------|------|
| 400 | 参数校验失败（如 temperature 超出范围） |

---

## 3. POST /api/settings/verify-key

验证 API Key 有效性。

**请求体**:

```json
{
  "provider": "openai",
  "apiKey": "sk-proj-xxxxxxxxxxxx"
}
```

**响应（成功）**:

```json
{
  "valid": true,
  "provider": "openai"
}
```

**响应（失败）**:

```json
{
  "valid": false,
  "provider": "openai",
  "error": "Invalid API key"
}
```

**行为**:
- 调用服务商的 `/models` 端点验证 Key
- 验证成功后自动保存 Key 到数据库
- 验证失败不保存，返回错误信息

**错误响应**:

| 状态码 | 条件 |
|--------|------|
| 400 | 缺少 provider 或 apiKey |
| 400 | 不支持的 provider |
| 502 | 服务商 API 不可达（网络问题） |

---

## 4. DELETE /api/settings/verify-key

删除已保存的 API Key。

**请求体**:

```json
{
  "provider": "openai"
}
```

**响应**:

```json
{
  "deleted": true,
  "provider": "openai"
}
```

---

## 5. GET /api/settings/models?provider=xxx

获取指定服务商的可用模型列表。

**查询参数**:
- `provider`: 服务商标识（`openai` | `anthropic` | `google`）

**响应**:

```json
{
  "provider": "openai",
  "models": [
    { "id": "gpt-4o-mini", "name": "GPT-4o Mini" },
    { "id": "gpt-4o", "name": "GPT-4o" },
    { "id": "gpt-4.1", "name": "GPT-4.1" }
  ],
  "source": "builtin"
}
```

**行为**:
- 优先返回内置默认模型列表（`source: "builtin"`）
- 如果该服务商已配置且验证通过的 API Key，尝试从 API 动态获取（`source: "api"`）
- API 获取失败时降级到内置列表

**错误响应**:

| 状态码 | 条件 |
|--------|------|
| 400 | 缺少 provider 参数 |
| 400 | 不支持的 provider |
