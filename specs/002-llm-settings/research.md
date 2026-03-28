# 研究报告：LLM 大模型设置页

**功能分支**: `002-llm-settings`
**日期**: 2026-03-28

## 1. API Key 存储方案

**决策**: 存储在 PostgreSQL 数据库中，使用 Prisma 的 `Settings` 单例模型

**依据**:
- 单用户应用，无需加密层面隔离（数据库本身由用户控制）
- Prisma schema 中新增 `AiSetting` 模型，使用 `key` 字段作为唯一标识
- API Key 以原文存储在数据库中，仅在 API 返回时做掩码处理

**替代方案**:
- 环境变量：已用作 fallback，但用户无法通过 UI 修改
- 文件系统存储：跨平台路径不一致，且不利于 Prisma 统一管理

## 2. API Key 验证方式

**决策**: 通过各服务商的 `/models` 端点进行轻量验证

**依据**:
- OpenAI: `GET https://api.openai.com/v1/models` — 只读、快速、无 Token 消耗
- Anthropic: `GET https://api.anthropic.com/v1/models` — 同上
- Google: `GET https://generativelanguage.googleapis.com/v1beta/models` — 同上
- 验证返回 200 即认为 Key 有效，返回 401/403 即无效

**替代方案**:
- 发送一条最小 completion 请求：消耗 Token，不经济
- 仅格式校验（检查前缀如 `sk-`）：无法验证真实性

## 3. 模型列表获取

**决策**: 内置默认模型列表 + API 动态获取作为增强

**依据**:
- 内置列表保证离线可用，且不依赖网络请求
- API 获取可展示最新模型（如 OpenAI 不断推出新模型）
- 内置默认列表：
  - OpenAI: `gpt-4o-mini`, `gpt-4o`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
  - Anthropic: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-6`
  - Google: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`

**替代方案**:
- 纯 API 获取：离线时无法选择模型
- 纯内置列表：无法获取新发布的模型

## 4. ai-client.ts 集成策略

**决策**: 修改 `getAIModel()` 和 `generateCompletion()` 优先从数据库读取配置，环境变量作为 fallback

**依据**:
- 保持向后兼容：已有环境变量配置的用户无需立即迁移
- 读取优先级：数据库设置 > 环境变量 > 系统默认值
- 新增 `getSettings()` 函数从数据库加载用户配置
- API Key 优先从数据库读取，未配置时回退到环境变量

## 5. 提示词模板管理

**决策**: 在 `src/lib/default-prompts.ts` 中定义默认模板，用户自定义版本存储在数据库

**依据**:
- 现有代码中硬编码了 3 处 systemPrompt（翻译、查词、摘要），需要提取为统一管理
- 默认模板与当前代码中的提示词保持一致，确保升级后不破坏现有体验
- 用户修改后的提示词存在数据库中，读取时优先使用自定义版本

## 6. 现有硬编码提示词提取

**决策**: 从 `translate.ts`、`summaries/route.ts`、`dictionary.ts` 中提取提示词到 `default-prompts.ts`

**依据**:
- 当前 3 个文件各有一段硬编码的中文 systemPrompt
- 提取后统一管理，支持用户自定义覆盖
- `generateCompletion()` 签名扩展为接受 promptType 参数，自动查找对应提示词

## 7. 默认模型 ID 对齐

**决策**: 默认模型列表从 `ai-client.ts` 的 `DEFAULT_MODELS` 迁移到 `default-prompts.ts` 或设置服务

**依据**:
- `ai-client.ts` 中已定义了 `DEFAULT_MODELS`（openai: gpt-4o-mini, anthropic: claude-haiku-4-5-20251001, google: gemini-2.0-flash）
- 保持一致，设置页的默认模型与此对齐
