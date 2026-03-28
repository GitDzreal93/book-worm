# 任务清单：LLM 大模型设置页

**输入**: 来自 `/specs/002-llm-settings/` 的设计文档
**前置条件**: plan.md（必需）、spec.md（用户故事必需）、research.md、data-model.md、contracts/

**组织方式**: 任务按用户故事分组，以实现每个故事的独立实现和测试。

## 格式：`[ID] [P?] [故事] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[故事]**: 此任务属于哪个用户故事（如 US1、US2、US3、US4）
- 描述中需包含确切文件路径

---

## 阶段 1：基础搭建

**目的**: 数据库模型和项目结构初始化

- [x] T001 在 `prisma/schema.prisma` 中新增 AiSetting 模型（key @unique, value, updatedAt），然后运行 `npx prisma migrate dev --name add-ai-setting`
- [x] T002 [P] 在 `src/types/settings.ts` 中定义 AIProvider 类型（7个预设服务商 + custom）、ModelInfo 接口、ProviderPreset 接口、AISettings 接口（default_provider, default_model, 7个服务商 _api_key, custom_provider_* 字段, prompt_* 字段）、DEFAULT_SETTINGS 常量、PRESET_PROVIDERS 数组、API_KEY_KEYS 数组、CUSTOM_PROVIDER 常量

---

## 阶段 2：基础设施（阻塞性前置条件）

**目的**: 所有用户故事共享的服务层、API 路由和默认配置

**⚠️ 关键**: 在此阶段完成之前，不得开始任何用户故事工作

- [x] T003 在 `src/lib/default-prompts.ts` 中定义 PROVIDER_PRESETS 数组（7个预设服务商的名称、API端点、默认模型列表），以及三组默认提示词模板（translate、dictionary、summary）；提供 getPreset()、getBuiltinModels()、getDefaultModelId() 辅助函数
- [x] T004 在 `src/lib/settings.ts` 中实现设置服务：getSetting(key)、getSettings()、setSetting(key, value)、setSettings(partial)、maskApiKey(key)、deleteSetting(key)
- [x] T005 在 `src/app/api/settings/route.ts` 中实现 GET（返回所有设置，API Key 掩码处理包括 custom_provider_api_key）和 POST（批量更新非 Key 设置）
- [x] T006 在 `src/app/api/settings/verify-key/route.ts` 中实现 POST（支持所有 7 个预设服务商 + 自定义服务商的 API Key 验证，自定义服务商接受 baseUrl/name/model 参数并一起保存）和 DELETE（删除指定服务商的 API Key，自定义服务商同时清除配置字段）
- [x] T007 在 `src/app/api/settings/models/route.ts` 中实现 GET（支持所有预设服务商 + 自定义服务商，根据 provider 参数返回内置模型列表或 API 动态获取的列表）
- [x] T008 在 `src/components/layout/NavBar.tsx` 的 NAV_ITEMS 数组中添加 { href: "/settings", label: "设置" } 导航入口

**检查点**: 基础设施就绪——API 路由可通过 curl/Postman 验证

---

## 阶段 3：用户故事 1 + 2 - AI 服务商/模型选择 + API Key 管理 (优先级: P1) 🎯 MVP

**目标**: 用户可选择 AI 服务商（7个预设 + 自定义）和模型，输入并验证 API Key

**独立测试**: 进入设置页 → 选择服务商 → 输入 API Key → 验证 → 选择模型 → 保存 → 触发翻译验证

- [x] T009 [US1] 创建设置页面服务端组件 `src/app/settings/page.tsx`
- [x] T010 [US1] [US2] 创建 `src/components/settings/SettingsPageClient.tsx`：展示 7 个预设服务商卡片 + 自定义服务商卡片，模型选择，提示词配置
- [x] T011 [US1] [US2] 创建 `src/components/settings/ProviderCard.tsx`：使用 getPreset() 动态获取服务商名称，支持所有 7 个预设服务商
- [x] T012 [US1] 创建 `src/components/settings/ModelSelector.tsx`：下拉选择框，根据 provider 加载模型列表

**检查点**: 服务商选择、API Key 配置和模型选择基本可用

---

## 阶段 4：提示词配置 (优先级: P2)

**目标**: 用户可自定义翻译、查词、摘要的系统提示词，使用专业级默认模板

**独立测试**: 展开提示词配置 → 修改翻译提示词 → 保存 → 触发翻译确认输出风格变化 → 恢复默认

- [x] T013 [P] [US3] 创建 `src/components/settings/PromptEditor.tsx`：提示词编辑器组件，textarea + 字符数 + "恢复默认"按钮
- [x] T014 [US3] 在 `src/components/settings/SettingsPageClient.tsx` 中集成 PromptEditor：三个 PromptEditor 实例（翻译、查词、摘要）

**检查点**: 提示词配置功能完整可用

---

## 阶段 5：收尾与集成

**目的**: 修改现有 AI 调用链路，支持所有服务商；删除已移除的高级设置组件

- [x] T015 修改 `src/lib/ai-client.ts`：支持所有 7 个预设服务商 + 自定义服务商；OpenAI 兼容服务商（OpenAI、DeepSeek、Qwen、Kimi、Doubao、Custom）使用 createOpenAI({ baseURL })；Anthropic 和 Google 使用专用 SDK；移除 temperature 参数
- [x] T016 [P] 修改 `src/lib/translate.ts`：从 getSetting("prompt_translate") 读取提示词
- [x] T017 [P] 修改 `src/app/api/summaries/route.ts`：从 getSetting("prompt_summary") 读取提示词
- [x] T018 [P] 修改 `src/lib/dictionary.ts`：从 getSetting("prompt_dictionary") 读取提示词
- [x] T019 删除 `src/components/settings/ParameterSlider.tsx`（高级设置已从规格中移除）

---

## 阶段 6：规格更新后的增量修改

**目的**: 根据 clarify 阶段的用户反馈，扩展服务商支持和改进提示词

- [x] T020 更新 `src/types/settings.ts`：扩展 AIProvider 至 7 个预设，添加 CUSTOM_PROVIDER、ProviderPreset 接口、PRESET_PROVIDERS、custom_provider_* 字段，移除 temperature/max_tokens，改进三组默认提示词
- [x] T021 更新 `src/lib/default-prompts.ts`：添加 PROVIDER_PRESETS 数组（7 个服务商的 API 端点和模型列表），添加 getPreset/getBuiltinModels/getDefaultModelId 函数
- [x] T022 更新 `src/lib/ai-client.ts`：支持所有预设服务商 + 自定义服务商，OpenAI 兼容的统一通过 createOpenAI({ baseURL }) 调用
- [x] T023 更新 `src/app/api/settings/verify-key/route.ts`：支持所有 7 个预设 + 自定义服务商验证，自定义服务商额外保存 base URL/名称/模型
- [x] T024 更新 `src/app/api/settings/models/route.ts`：支持所有预设 + 自定义服务商的模型列表获取
- [x] T025 更新 `src/app/api/settings/route.ts`：GET 掩码处理包含 custom_provider_api_key
- [x] T026 更新 `src/components/settings/ProviderCard.tsx`：使用 getPreset() 获取服务商名称，支持所有预设
- [x] T027 更新 `src/components/settings/SettingsPageClient.tsx`：7 个预设卡片 + 自定义服务商表单（base URL + 名称 + 模型 + API Key），移除 ParameterSlider 引用
- [x] T028 删除 `src/components/settings/ParameterSlider.tsx`

---

## 依赖与执行顺序

### 阶段依赖

- **基础搭建（阶段 1）**: 无依赖
- **基础设施（阶段 2）**: 依赖阶段 1
- **US1+US2（阶段 3）**: 依赖阶段 2
- **US3 提示词（阶段 4）**: 依赖阶段 3
- **收尾（阶段 5）**: 依赖阶段 2
- **增量修改（阶段 6）**: 依赖阶段 2-5 完成

---

## 实现策略

### MVP 优先（US1 + US2）

1. 完成阶段 1-2：基础搭建 + 基础设施
2. 完成阶段 3：服务商选择 + API Key 管理 + 模型选择
3. 完成阶段 5：ai-client 集成
4. 完成阶段 4：提示词配置
5. 完成阶段 6：规格增量修改 → 构建验证通过

---

## 注意事项

- [P] 标记 = 不同文件，无依赖
- [故事] 标记将任务映射到特定用户故事以便追溯
- API Key 必须在 GET 返回时掩码处理
- ai-client.ts 需保持向后兼容：数据库无配置时回退到环境变量
- OpenAI 兼容服务商（DeepSeek、Qwen、Kimi、Doubao）统一通过 createOpenAI({ baseURL }) 调用
- 自定义服务商同样使用 OpenAI 兼容协议，用户需提供 base URL
