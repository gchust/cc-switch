# Grok 4.5 reasoning effort 官方资料核对

核对日期：2026-07-20

## 结论

xAI 官方针对 `grok-4.5` 明确列出的 reasoning effort 只有三个：

- `low`
- `medium`
- `high`（默认值）

`grok-4.5` 的 reasoning 不能关闭，因此不应为它提供 `none` / “Disable Thinking”。如果请求没有设置 effort，官方说明默认使用 `high`。
官方资料也没有为 Grok 4.5 列出 `minimal` 或 `xhigh`。

这意味着 CC Switch 给 `grok-4.5` 生成的模型目录应至少描述为：

```json
{
  "defaultReasoningLevel": "high",
  "supportedReasoningLevels": [
    { "effort": "low", "description": "Low" },
    { "effort": "medium", "description": "Medium" },
    { "effort": "high", "description": "High" }
  ]
}
```

## API 字段

同一组三个值适用于 xAI 官方列出的两种 API，但请求字段形式不同：

| API | 请求形式 | 官方依据 |
| --- | --- | --- |
| Responses API | `"reasoning": { "effort": "low" | "medium" | "high" }` | 官方 Reasoning 文档的 OpenAI SDK 与 cURL 示例 |
| Chat Completions / xAI SDK Chat | `reasoning_effort="low" | "medium" | "high"` | 官方 Reasoning 文档的 xAI SDK 示例；Grok 4.5 概览明确列出 Chat Completions 受支持 |

xAI 已把 Chat Completions 标为 legacy，并说明新功能优先进入 Responses API。对 CC Switch 的 Native Responses 路由，应发送嵌套的 `reasoning.effort`。

## 不应混用其他 Grok 型号的枚举

- `grok-4.5`：`low` / `medium` / `high`，默认 `high`，不可关闭。
- `grok-4.20-multi-agent`：官方列出 `low` / `medium` / `high` / `xhigh`，但这里的 effort 控制参与协作的 agent 数量，而不是 Grok 4.5 的推理深度。
- xAI 官方 Grok Build 的默认模型目录再次确认 `grok-4.5` 只配置 high、medium、low，并将 high 标为默认值；其 API backend 是 Responses。
- xAI 官方 Python SDK 的通用 `ReasoningEffort` 类型还包含 `none`。这是跨模型的通用类型，不等于每个模型都接受所有枚举；模型专属文档明确排除了 Grok 4.5 的 `none`。
- 旧的/通用 REST API Reference 目前仍写着参数“Only supported by `grok-4.3`”，并给出 `none` 且称默认值为 `low`。这与 2026-07-16 更新的 Grok 4.5 专属文档直接冲突，应视为尚未同步的通用 schema 文案，不能用来定义 Grok 4.5 的能力。

## 第一方来源

1. [xAI：Reasoning](https://docs.x.ai/developers/model-capabilities/text/reasoning#the-reasoning_effort-parameter)
   - 原文：`grok-4.5 supports the reasoning_effort parameter`。
   - 原文：`If not specified, reasoning_effort defaults to "high". Reasoning cannot be disabled.`
   - Effort levels 表只列出 `low`、`medium`、`high`，并标记 `high` 为默认值。
   - Summary table 明确写出 `grok-4.5` 的 `reasoning.effort` 为 `"low" / "medium" / "high" (default)`。
   - 同页示例同时展示 xAI SDK Chat 的 `reasoning_effort="high"` 和 Responses API 的 `reasoning={"effort": "high"}`。

2. [xAI：Grok 4.5](https://docs.x.ai/developers/grok-4-5)
   - At a glance 表写明：`Reasoning | Low, medium, or high (default high)`。
   - APIs 一栏同时列出 Responses API 和 Chat Completions。
   - 页面元数据标示其更新日期为 2026-07-16。

3. [xAI 官方 Grok Build：默认模型目录](https://github.com/xai-org/grok-build/blob/ba76b0a683fa52e4e60685017b85905451be17bc/crates/codegen/xai-grok-models/default_models.json#L8-L39)
   - `grok-4.5` 的 `api_backend` 是 `responses`。
   - `reasoning_efforts` 只列出 high、medium、low。
   - `reasoning_effort` 是 `high`，且 high 项标记为 `default: true`。

4. [xAI：Responses API 与 Chat Completions 对比](https://docs.x.ai/developers/model-capabilities/text/comparison)
   - 官方把 Chat Completions 标为 deprecated/legacy，并说明 Reasoning Models 在 Responses API 中获得完整支持。

5. [xAI：Inference API Reference](https://docs.x.ai/developers/rest-api-reference/inference/chat)
   - 该通用参考页分别定义 Chat Completions 的 `reasoning_effort` 和 Responses API 的 `reasoning.effort`。
   - 其型号限制和默认值文案仍停留在 `grok-4.3`，与上面较新的 Grok 4.5 专属文档冲突，因此这里只用它核对字段位置，不用它决定 Grok 4.5 的枚举或默认值。

6. [xAI 官方 Python SDK：通用 ReasoningEffort 类型](https://github.com/xai-org/xai-sdk-python/blob/4358bc235e8641ba5f0cb54599675d098385d4bf/src/xai_sdk/types/chat.py)
   - SDK 的跨模型类型是 `Literal["none", "low", "medium", "high"]`。
   - 这说明 SDK 客户端能编码 `none`，但不推翻 Grok 4.5 专属文档给出的模型级限制。
