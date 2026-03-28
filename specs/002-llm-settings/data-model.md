# 数据模型：LLM 大模型设置页

**功能分支**: `002-llm-settings`
**日期**: 2026-03-28

## 新增模型

### AiSetting（AI 设置 — 键值对单例）

通用键值存储模型，用于持久化用户的 AI 配置。每条记录由唯一的 `key` 标识。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid | 主键 |
| key | String | @unique | 设置项键名 |
| value | String | — | 设置项值（JSON 字符串） |
| updatedAt | DateTime | @updatedAt | 最后修改时间 |

**存储的键值对示例**:

| key | value | 说明 |
|-----|-------|------|
| `default_provider` | `"openai"` | 默认 AI 服务商 |
| `default_model` | `"gpt-4o-mini"` | 默认模型 ID |
| `temperature` | `"0.7"` | 温度参数 |
| `max_tokens` | `"4096"` | 最大输出 Token |
| `openai_api_key` | `"sk-proj-xxx..."` | OpenAI API Key |
| `anthropic_api_key` | `"sk-ant-xxx..."` | Anthropic API Key |
| `google_api_key` | `"AIzaxxx..."` | Google API Key |
| `prompt_translate` | `"你是专业的文学翻译家..."` | 翻译提示词 |
| `prompt_dictionary` | `"你是专业的英语词典..."` | 查词提示词 |
| `prompt_summary` | `"你是一位文学评论家..."` | 摘要提示词 |

**设计理由**:
- 键值对模式灵活，新增设置项无需迁移
- 单用户应用，不需要 userId 外键
- `value` 存储为 JSON 字符串，复杂结构（如模型列表）也可存储

## 现有模型变更

无。现有 Prisma 模型不需要修改。本功能仅新增 `AiSetting` 表。

## 关系图

```text
AiSetting（独立表，无外键关系）
```

`AiSetting` 与现有业务模型（Book、Chapter 等）无直接关联，它是一个全局配置表。
