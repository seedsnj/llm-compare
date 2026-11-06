# Stage 0：数据源验证与项目骨架

- 最后更新：2026-11-06
- 文档版本：1.0.0

验证日期：2026-11-06（Europe/Berlin）

## 结论摘要

- `models.dev` 的公开 JSON API 可用。响应是顶层 provider 对象，其中 `github-copilot` 当前有 36 个模型；27 个没有 `status`，9 个明确标为 `deprecated`。
- Claude Sonnet 5、Claude Sonnet 5.5、Claude Fable 5、Claude Fable 5.1 和 GPT-6 系列均在 `models.dev` 中精确存在。GPT-5.5 也存在，但被标记为 `deprecated`；GitHub 官方退役表写明其退役日期为 2026-10-19。
- `models.dev` 的 36 个模型全部提供 `cost.input`、`cost.output` 和 `cost.cache_read`。将 27 个非 deprecated 条目与 GitHub Docs 原始 YAML 的默认价格逐项核对，27/27 的 input、cached input、output 完全一致。
- GitHub Docs 的 HTML 页面可达，但按规格未解析。通过 LiteLLM 条目中的 `source` 发现其背后的机器可读 YAML：`models-and-pricing.yml`。该 YAML 是官方维护、每百万 token 计价的数据表，可作为人工验证和快照核对基准。
- LiteLLM JSON 可用，包含 50 个 `github_copilot/` 条目；其中 33 个同时具有 input、output 和 cached input 三项价格。它是派生源，且混杂已退役模型，不适合作为当前模型清单的唯一主源。
- ai-model-index 的真实路径是 `data/llm/*.json`，不是仓库根目录。`aa-intelligence.json` 和 `scicode.json` 可用；`aa-coding.json` 当前是空榜单；`livecodebench.json` 虽有数据，但不含本轮目标的新模型。
- LMArena 的实际数据集比线索更丰富：除总体 `text` 外，还提供 `document`、`webdev` 以及 `agent_*` 子指标。它最适合提供任务邻近证据，但行 API 未返回浏览器可用的 CORS 头，纯前端不能直接实时读取。
- 五个任务中，没有任何候选源直接测量“团队合作/竞争/拆台的基本理解”。LMArena 的 praise/complaint 只测量用户对单次结果的明确正负反馈，不能外推为团队协作情商。
- Vite + React + TypeScript 骨架已安装依赖并通过生产构建和本地开发服务器验证。直接依赖 4 个，App 仅渲染占位文本。

## 候选数据源实测

### 请求结果

所有请求均在联网权限恢复后重新执行。表中的代码块路径是供本轮统计使用的临时响应，不进入应用。

| 数据源 | URL | 状态 | 响应类型与顶层结构 |
| --- | --- | --- | --- |
| models.dev API | `https://models.dev/api.json` | 200 | 5,964,680 bytes；JSON 对象，235 个 provider 键 |
| models.dev provider 页面 | `https://models.dev/?provider=github-copilot` | 200 | 2,241,087 bytes；HTML；仅确认可达 |
| GitHub Docs 定价页 | `https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing` | 200 | 708,144 bytes；HTML；未解析 |
| GitHub 官方定价 YAML | `https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/models-and-pricing.yml` | 200 | 9,088 bytes；YAML 数组，41 行、29 个唯一模型 |
| GitHub 官方退役 YAML | `https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/model-deprecation-history.yml` | 200 | 4,989 bytes；YAML 数组 |
| LiteLLM JSON | `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` | 200 | 3,442,739 bytes；JSON 对象，4,759 个顶层键 |
| ai-model-index 仓库树 | `https://api.github.com/repos/EvanZhouDev/ai-model-index/git/trees/main?recursive=1` | 200 | JSON 对象；`sha/url/tree/truncated`；提交树 `25e61255869db9558c854c66fa257e97034a5683` |
| aa-intelligence | `https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-intelligence.json` | 200 | JSON 对象；30 个模型 |
| aa-coding | `https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-coding.json` | 200 | JSON 对象；`models` 为空数组 |
| scicode | `https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/scicode.json` | 200 | JSON 对象；30 个模型 |
| livecodebench | `https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/livecodebench.json` | 200 | JSON 对象；30 个模型 |
| HF 数据集搜索 | `https://huggingface.co/api/datasets?search=leaderboard-dataset&limit=10` | 200 | JSON 数组，10 条结果 |
| LMArena 数据集元数据 | `https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset?full=true` | 200 | JSON 对象；`dataset_info` 含 23 个 config |
| LMArena splits | `https://datasets-server.huggingface.co/splits?dataset=lmarena-ai%2Fleaderboard-dataset` | 200 | JSON 对象；`splits/pending/failed` |
| LMArena rows API | `https://datasets-server.huggingface.co/rows`，参数指定 config/split/offset/length | 200 | JSON 对象；`features/rows/num_rows_total/num_rows_per_page/partial` |

### models.dev

顶层是对象，不是数组。`github-copilot` provider 的字段为：

```text
id, env, npm, api, name, doc, models
```

实际响应片段（省略未展示字段）：

```json
{
  "github-copilot": {
    "id": "github-copilot",
    "name": "GitHub Copilot",
    "doc": "https://docs.github.com/en/copilot",
    "models": {
      "gpt-5.5": {
        "id": "gpt-5.5",
        "name": "GPT-5.5",
        "status": "deprecated",
        "limit": {
          "context": 1050000,
          "input": 922000,
          "output": 128000
        },
        "cost": {
          "input": 5,
          "output": 30,
          "cache_read": 0.5,
          "context_over_200k": {
            "input": 10,
            "output": 45,
            "cache_read": 1
          }
        },
        "canonical_model_id": "openai/gpt-5.5"
      },
      "claude-sonnet-5.5": {
        "id": "claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5",
        "cost": {
          "input": 2,
          "output": 10,
          "cache_read": 0.1,
          "cache_write": 2.5
        },
        "limit": {
          "context": 1000000,
          "output": 128000
        },
        "canonical_model_id": "anthropic/claude-sonnet-5-5"
      }
    }
  }
}
```

模型级字段集合包括：

```text
id, name, description, family, attachment, reasoning, reasoning_options,
tool_call, structured_output, temperature, knowledge, release_date,
last_updated, modalities, open_weights, limit, provider, cost,
canonical_model_id, status
```

`cost` 中出现过的字段：

```text
input, output, cache_read, cache_write, input_audio,
context_over_200k, tiers
```

推断单位为 `$/1M token`：`models.dev` 的数值与官方 YAML 明确标注的 “Prices are per 1 million tokens” 在 27 个共同有效模型上逐项一致。`cost.tiers` 表示长上下文档位，主表若只显示一个 input/output 值，应默认显示基础档并加层级说明。

模型对象内的 `provider` 是 AI SDK 适配器信息，不是供应商显示名。供应商可由 `canonical_model_id` 的受控前缀（`openai/`、`anthropic/` 等）或官方 YAML 的 `provider` 字段得到，不应从模型名称推断。

### GitHub Docs 与官方 YAML

GitHub Docs HTML 返回 `text/html`，本轮只读取状态和响应头，未解析页面。LiteLLM 的价格条目公开提供了 GitHub 官方源：

```json
{
  "source": "https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/models-and-pricing.yml"
}
```

官方 YAML 顶层是数组，每行字段为：

```text
model, provider, release_status, category, input, cached_input,
output, cache_write, threshold, tier
```

文件头明确声明价格为每百万 token。实际片段：

```yaml
- model: Claude Sonnet 5.5
  provider: anthropic
  release_status: GA
  category: Versatile
  input: $2.00
  cached_input: $0.10
  output: $10.00
  cache_write: $2.50
```

退役表字段为：

```text
name, retirement_date, suggested_alternative
```

其中明确记录：

```yaml
- name: 'GPT-5.5'
  retirement_date: '2026-10-19'
  suggested_alternative: 'Latest GPT Sol model'
```

因此，“仍出现在某个定价文件中”不等于“当前可调用”。当前清单必须同时检查 `models.dev.status` 和官方退役表。

官方 YAML 自身也存在不一致：退役表显示 Claude Sonnet 4 于 2026-05-01 退役，但定价 YAML 仍保留其 GA 价格行。当前可用状态不能只看 `release_status: GA`。

### LiteLLM

顶层为对象，4,759 个键中以 `github_copilot/` 开头的有 50 个。观察到的主要字段：

```text
input_cost_per_token
output_cost_per_token
cache_read_input_token_cost
cache_creation_input_token_cost
litellm_provider
max_input_tokens
max_output_tokens
mode
source
supported_endpoints
supports_adaptive_thinking
supports_function_calling
supports_parallel_function_calling
supports_reasoning
supports_response_schema
supports_vision
deprecation_date
deprecation_source
```

真实片段（截取）：

```json
{
  "github_copilot/claude-sonnet-5": {
    "input_cost_per_token": 0.000002,
    "cache_read_input_token_cost": 0.0000002,
    "output_cost_per_token": 0.00001,
    "litellm_provider": "github_copilot",
    "mode": "chat",
    "source": "https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/models-and-pricing.yml"
  }
}
```

50 个条目中只有 33 个同时具有三项价格字段，其余 17 个不能安全用于用量计费。价格单位为每 token，展示前必须乘 `1,000,000`。GPT-5.5、Sonnet 5、Sonnet 5.5、Fable 5/5.1 在 LiteLLM 中均有数值。

### ai-model-index

仓库树确认真实路径位于 `data/llm/`。四个榜单都有相同的顶层字段：

```text
generated_at, limit, modality, metric, source_metric, source, models
```

模型项字段：

```text
rank, name, slug, creator, score
```

2026-11-04 的 `aa-intelligence` 实际片段：

```json
{
  "generated_at": "2026-11-04T15:27:45.740Z",
  "limit": 30,
  "metric": "aa-intelligence",
  "source_metric": "artificial_analysis_intelligence_index",
  "models": [
    {
      "rank": 9,
      "name": "Claude Sonnet 5.5 (Max, Default Fallback)",
      "slug": "claude-sonnet-5-5",
      "creator": "Anthropic",
      "score": 54.5
    }
  ]
}
```

`aa-coding` 的完整关键片段是：

```json
{
  "generated_at": "2026-11-04T15:27:45.740Z",
  "limit": 30,
  "metric": "aa-coding",
  "source_metric": "artificial_analysis_coding_index",
  "models": []
}
```

`scicode` 中 Claude Sonnet 5.5 排名第 6，`score` 为 `0.61`。`livecodebench` 的前三名是 Gemini 3 Pro Preview、Gemini 3 Flash Preview、DeepSeek V3.2 Speciale，不含 GPT-5.5、Sonnet 5 或 Sonnet 5.5。

分数尺度不同：aa-intelligence 当前约为 42–60，SciCode 和 LiveCodeBench 为 0–1。应用不能用跨源原始分数做统一排序，只能在同一榜单内排序。

### LMArena

搜索确认数据集为 `lmarena-ai/leaderboard-dataset`。2026-11-06 的仓库 SHA 是：

```text
5a7e6bb84a93f55df56b198be8e56e53755a216a
```

相关 config 与字段：

| Config | 行字段 | `latest` 规模 | 发布日期 | 与任务的直接关系 |
| --- | --- | ---: | --- | --- |
| `text` | `model_name`, `organization`, `rating`, `rating_lower`, `rating_upper`, `variance`, `vote_count`, `rank`, `category`, `leaderboard_publish_date` | 11,132 | 2026-10-28 | 总体人类偏好 |
| `document` | 同 `text` | 44 | 2026-09-13 | 文档任务人类偏好 |
| `webdev` | 同 `text` | 655 | 2026-10-28 | Code Arena，网页实现偏好 |
| `agent` | `score`, `score_ci_lower`, `score_ci_upper`, `observation_count`, `session_count` 等 | 58 | 2026-11-04 | Agent Arena 综合信号 |
| `agent_bash_reliability` | Agent 计分字段 | 58 | 2026-11-04 | Bash 调用失败率 |
| `agent_task_outcome_explicit` | Agent 计分字段 | 58 | 2026-11-04 | 用户明确确认任务完成 |
| `agent_steerability` | Agent 计分字段 | 58 | 2026-11-04 | 用户纠正所需工作量 |
| `agent_tool_hallucination` | Agent 计分字段 | 58 | 2026-11-04 | 虚构工具或错误调用 |
| `agent_praise_complaint` | Agent 计分字段 | 58 | 2026-11-04 | 单次用户表扬/投诉成功率 |

真实行片段：

```json
{
  "model_name": "Claude Sonnet 5.5 (xHigh)",
  "organization": "anthropic",
  "rating": 1769.7283971913196,
  "rating_lower": 1758.450297298834,
  "rating_upper": 1781.006497083805,
  "variance": 33.111258800867795,
  "vote_count": 4469,
  "rank": 3,
  "category": "overall",
  "leaderboard_publish_date": "2026-10-28"
}
```

这是 `webdev` 的 Claude Sonnet 5.5 行。`document` 中 GPT-5.5 的对应行排名第 8，`rating` 为 `1485.7193136054452`，`vote_count` 为 `21279`，发布日期为 `2026-09-13`。

`agent_bash_reliability` 中 Claude Sonnet 5 `(High)` 排名第 1，`score` 为 `0.1508228006557272`，`observation_count` 为 `231347`。该分数越高越好；页面说明它按非豁免 Bash 调用中的失败率计分。

浏览器直连限制：

- models.dev、GitHub raw 和 ai-model-index raw 返回 `Access-Control-Allow-Origin: *`。
- `datasets-server.huggingface.co/rows` 的实测响应没有 `Access-Control-Allow-Origin`。
- Hugging Face 数据集元数据 API 仅返回 `Access-Control-Allow-Origin: https://huggingface.co`。
- 因此纯前端 App 不应依赖浏览器实时请求 LMArena 行数据。Stage 1 应使用带有数据集 SHA 和发布日期、经核对的静态 JSON 快照。

## 目标模型覆盖

### 定价源覆盖

| 定价源 | GPT-5.5 | Claude Sonnet 5 | Claude Sonnet 5.5 | Fable 5 / 5.1 | 新代际 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| models.dev | 有，标为 deprecated | 有 | 有 | 有 | 有 | 主运行时源候选 |
| GitHub 官方 YAML | 无；退役表称已退役 | 有 | 有 | 有 | 有 | 官方核对源 |
| LiteLLM | 有且完整 | 有且完整 | 有且完整 | 有且完整 | 有 | 后备/交叉核对 |

当前状态统计：

- `models.dev` 共 36 个模型：27 个没有 deprecated 标记，9 个明确 deprecated。
- 官方 YAML 有 29 个唯一模型。
- 两者的 27 个共同有效模型，input/cached input/output 三项价格为 27/27 一致。
- 官方 YAML 当前有一个 `Claude Opus 4.8 (fast mode) (preview)` 条目，`models.dev` 没有对应 ID；`models.dev` 当前也没有官方仍保留的 Claude Sonnet 4。
- 官方退役表说明 GPT-5.5 从 2026-10-19 起退役；`models.dev` 将其保留为 deprecated，而不是删除。

### 能力源覆盖

这里的“有”只表示出现可精确关联的目标模型记录，不表示分数一定足以预测全部任务。

| 能力源 | GPT-5.5 | Claude Sonnet 5 | Claude Sonnet 5.5 | 更新的代际 |
| --- | --- | --- | --- | --- |
| aa-intelligence | 无 | 无 | 有，rank 9 | 有 |
| aa-coding | 无 | 无 | 无 | 无，榜单为空 |
| SciCode | 无 | 无 | 有，rank 6 | 有 |
| LiveCodeBench | 无 | 无 | 无 | 无；榜单模型较旧 |
| LMArena `text` | 有 | 有 | 有 | 有 |
| LMArena `document` | 有 | 无 | 无 | 有 |
| LMArena `webdev` | 有 | 有 | 有 | 有 |
| LMArena `agent` | 无 | 有 | 有 | 有 |
| LMArena Bash 信号 | 无 | 有 | 有 | 有 |

这张表说明可观测性并不均等。Sonnet 5.5 覆盖最好；GPT-5.5 只有 LMArena 的总体、文档和 Web 开发代理，没有当前 AI 指数；Sonnet 5 缺少 AI 指数，但在 LMArena 多个专项中可查。

## 五类任务 × 能力源覆盖矩阵

### 判定口径

- **有数据**：源直接测量该任务，存在可精确关联的模型和分数。
- **部分数据**：源测量相关代理能力，但没有直接测量任务；预测必须使用低或中低置信度。
- **无数据**：没有可直接使用的任务证据，或当前榜单没有目标模型。

源级覆盖不代表模型级覆盖。例如 `document` 可以支撑文档预测，但 Sonnet 5.5 不在该榜单，因此 Sonnet 5.5 的文档预测仍须显示 `—`。

| 任务 | AA Intelligence | AA Coding | SciCode | LiveCodeBench | LMArena Document | LMArena Webdev | LMArena Agent 信号 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 理解、整理开发文档 | 部分数据 | 无数据 | 无数据 | 无数据 | 部分数据 | 无数据 | 无数据 |
| 架构发现与定义 | 部分数据 | 无数据 | 无数据 | 无数据 | 无数据 | 部分数据 | 部分数据 |
| 规范定义和实现 | 部分数据 | 无数据 | 部分数据 | 部分数据 | 无数据 | 有数据（仅实现侧） | 部分数据 |
| 测试与命令行驱动开发 | 部分数据 | 无数据 | 部分数据 | 部分数据 | 无数据 | 无数据 | 有数据（仅 Bash 可靠性） |
| 日常协作情商 | 无数据 | 无数据 | 无数据 | 无数据 | 无数据 | 无数据 | 无数据 |

### 逐任务结论

1. **理解、整理开发文档**

   - LMArena `document` 直接提供文档任务的人类偏好、置信区间和票数，是最接近的来源；但它不是专门的“开发文档理解/整理”基准，因此为部分数据。
   - aa-intelligence 只提供综合推理代理，不能证明摘要、信息组织或技术写作质量，因此为部分数据。
   - AA Coding 为空，SciCode 和 LiveCodeBench 不测量文档整理，Webdev 与 Agent 不直接测量文档任务，因此均为无数据。
   - Sonnet 5.5 不在 `document` 当前快照中，不能借用 Sonnet 5 的分数。GPT-5.5 在 `document` 中有数据。

2. **架构发现与定义**

   - 没有候选源提供“架构发现/定义”专项评测。aa-intelligence 只能代理复杂推理，Webdev 只能代理实现，Agent steerability/confirmed success 只能代理执行中的纠偏和完成度。
   - 这些关系都不足以单独证明边界划分、依赖设计、权衡和 ADR 写作能力，因此所有可用来源最高只能标为部分数据。
   - AA Coding 为空，SciCode 和 LiveCodeBench 不测量架构任务，因此无数据。

3. **规范定义和实现**

   - LMArena Webdev 对实现侧有直接的人类偏好数据，但不评价需求澄清、验收标准和规范完整性，因此只能算部分任务覆盖。
   - Agent `task_outcome_explicit` 直接观察用户是否明确确认任务完成，`steerability` 观察用户纠正成本，二者可支撑任务交付预测，但不是规范定义基准。
   - aa-intelligence、SciCode、LiveCodeBench 均只能作为推理或程序求解代理；AA Coding 当前为空。

4. **测试与命令行驱动开发**

   - LMArena Bash Reliability 直接测量非豁免 Bash 调用中的失败率，是命令行执行可靠性的直接证据。
   - 它不测量测试设计、断言质量、CI 配置或根据失败日志定位根因，所以仍不能代表完整的“测试与命令行驱动开发”。
   - SciCode 和 LiveCodeBench 能提供程序求解代理；aa-intelligence 只能提供通用推理代理；AA Coding 当前无数据。

5. **日常协作情商（团队合作/竞争/拆台的基本理解）**

   - 所有能力源均为无数据。
   - LMArena `agent_praise_complaint` 的官方说明是：统计多轮任务中用户明确表扬或投诉后形成的结果。它衡量单用户对结果的满意反馈，不测量团队角色、竞争、拆台、利益冲突或如何识别并化解团队摩擦。
   - 因此该列必须始终显示「无可信数据」，不能把 praise/complaint 排名改名为协作情商。

### 用于预测时的硬约束

- 每个预测卡片必须同时展示数据源 URL、榜单发布日期、指标定义、推断逻辑和置信度。
- LMArena ratings、Agent IPS score、AA Intelligence 分数、SciCode/LiveCodeBench 百分比不是同一尺度，禁止混合计算“总能力分”。
- 相同模型的不同 reasoning profile 是不同榜单行。Copilot ID 与 `slug`/`model_name` 之间必须维护显式、人工核对的别名，不能用包含匹配或名称相似度。
- 无记录、快照早于模型发布、榜单不在 top-30、或只能匹配到其他 reasoning profile 时，对应值显示 `—`，预测理由显示「无可信数据」。
- “没有进入 top-30”不等于低能力，只能表示该来源没有可比数据。

## 数据源取舍

### 定价

1. **运行时主源采用 models.dev JSON API。**

   - 它已经是结构化 JSON，字段稳定且 CORS 为 `*`。
   - 36 个 Copilot 模型全部具备 input/output/cache_read；带 `status` 的条目可直接过滤退役模型。
   - 27 个非 deprecated 条目与官方 YAML 的默认档价格 27/27 一致，足以作为可信展示源。
   - 只把 `github-copilot.models` 子集写入 localStorage，不能缓存整个 5.96 MB 响应，否则可能超过常见 localStorage 配额。

2. **GitHub 官方 YAML 作为验证与快照基准。**

   - 它明确写明 `$/1M token`，字段包含 `input`、`cached_input`、`output` 和 `cache_write`。
   - 它不是 HTML，符合“不解析 GitHub Docs HTML”的约束。
   - 前端不直接解析 YAML，因为需要增加解析逻辑或依赖；Stage 1 使用它人工核对 models.dev，必要时通过构建期生成的 JSON 快照落地。

3. **LiteLLM 仅作后备和交叉核对。**

   - 50 个 Copilot 条目中只有 33 个价格完整，且没有可靠的当前/退役集合。
   - 单位为每 token，与产品展示单位不同。
   - 官方源字段已能覆盖目标模型，YAGNI 下不必为它增加运行时分支。

缓存命中价格可得：

- models.dev 的 36 个模型均有 `cost.cache_read`。
- 官方 YAML 的对应字段是 `cached_input`。
- LiteLLM 的 33 个完整条目均有 `cache_read_input_token_cost`。
- cached input 是可空字段；缺失时显示 `—`。开关关闭时，React 不渲染该列，确保不出现在 DOM。

长上下文定价需要明确展示口径：

- models.dev 对部分模型提供 `cost.tiers` 或 `context_over_200k`。
- 官方 YAML 用多个 `tier` 行表示阈值前后价格。
- 主表只显示基础档时，应显示基础档阈值，并解释超阈值价格另计；不能把一个基础价冒充全上下文统一价。

### 能力

1. **LMArena 作为任务邻近证据的主来源。**

   - `document`、`webdev`、Agent 信号与五类任务中的四类有直接邻近关系。
   - 行级数据同时提供发布日期、排名、置信区间、vote/observation/session 数，可解释不确定性。
   - 不能浏览器实时读取，因此应冻结经过筛选、带数据集 SHA 和发布日期的静态 JSON 快照。

2. **ai-model-index 作为通用指数补充。**

   - aa-intelligence、SciCode 可用于慢变化或旧代际模型的低置信度推理/程序求解代理。
   - aa-coding 当前为空，不可作为编码能力依据。
   - LiveCodeBench 当前没有目标模型，不能支撑目标模型的测试开发预测。
   - top-30 截断使覆盖率天然不足；缺失时必须显示 `—`。

3. **不引入其他能力源。**

   - 不抓取厂商营销页，不把模型卡中的功能声明当成实测能力，不根据参数规模或价格推断质量。

## 项目骨架

文件树（`node_modules/` 与 `dist/` 被 `.gitignore` 排除）：

```text
.
├── .gitignore
├── index.html
├── package-lock.json
├── package.json
├── reports/
│   └── stage-0.md
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── tsconfig.json
└── vite.config.ts
```

直接依赖共 4 个，满足 ≤ 5：

| 包 | 已安装版本 | 作用 |
| --- | --- | --- |
| `react` | 18.3.1 | UI 运行时 |
| `react-dom` | 18.3.1 | 浏览器渲染 |
| `vite` | 5.4.21 | 开发服务器与构建 |
| `typescript` | 5.9.3 | TypeScript 源文件与配置 |

`npm install --ignore-scripts --no-audit --no-fund` 成功，共安装 17 个直接及传递包，并生成 `package-lock.json`。没有引入 React 插件、类型包、状态管理、图表、HTML 解析或 HTTP 客户端。

验证结果：

- `npm run build` 成功，Vite 转换 31 个模块并生成 `dist/`。
- `npm run dev -- --host 127.0.0.1 --port 4179` 启动成功。
- 对本地页面请求返回 `200`，HTML 包含标题和 `/src/main.tsx`。
- App 仅渲染 “GitHub Copilot 模型对比 / Stage 0 项目骨架。业务功能尚未实现。”

依赖取舍：

- 未安装 `@types/react` 和 `@types/react-dom`，因此当前没有独立的 `tsc` 类型检查，Vite 使用 esbuild 转译 TSX。
- 这是为满足 “依赖总数 ≤ 5” 采取的保守口径。控制器需要确认开发期类型包是否不计入上限；若不计入，Stage 1 应补两个类型包和 `typecheck` 脚本。

## 关键决策

1. 使用 models.dev JSON 作为运行时定价主源，以其 `status` 和官方退役表共同判断当前可用性。
2. 不解析 GitHub Docs HTML；发现并使用其原始 YAML 作为官方核对基准。
3. GPT-5.5 当前被官方标记为退役，不能不加说明地放入“当前可用”列表。
4. cached input 默认关闭；关闭时不渲染 DOM 列，开启时才使用 models.dev 的 `cost.cache_read`。
5. LMArena 是任务预测的主要邻近数据，但必须使用固定快照；不直接依赖其无 CORS 的 rows API。
6. AA Coding 空榜单和 LiveCodeBench 旧榜单不得用于目标模型预测。
7. 无精确模型匹配、无专项依据或快照早于模型发布时，显示 `—` /「无可信数据」。
8. 不跨榜单合并分数。对比与排序只在同一指标、同一发布时间和同一 reasoning profile 内进行。
9. 保持 4 个直接依赖的最小骨架；不引入额外运行时库。

## 需要控制器裁决的问题

1. **GPT-5.5 的展示方式**：官方称其于 2026-10-19 退役，但需求仍明确关心 GPT-5.5。建议当前列表默认排除它，另设“历史/退役模型”区并可从该区查看价格与 LMArena 数据。是否接受？
2. **当前模型清单的合并口径**：models.dev 有 27 个非 deprecated 模型，但缺少官方定价表中的当前 fast-mode preview；官方表又有退役状态冲突。是否允许使用“models.dev 有效条目 + 官方非退役补充”的静态合并清单？
3. **LMArena 更新方式**：其行 API 无浏览器 CORS，纯前端不能直接刷新。是否接受 LMArena 使用随代码发布的静态快照，并由“手动更新”按钮只刷新 models.dev 等可跨域源？若要求能力数据也由浏览器手动更新，需要允许构建期更新脚本或新增外部能力，后者会突破纯前端约束。
4. **长上下文价格展示**：需求只要求 input/output 单列。建议主表显示基础档，并在同一单元格标注阈值。是否需要在 Stage 1 增加 tier 筛选？

## Stage 1 建议

1. 先生成并冻结三份经核对的数据：

   - models.dev 的 GitHub Copilot 子集快照，保留原始模型 ID、status、cost、limit、canonical ID 和抓取时间。
   - LMArena 相关 `latest` 行的最小快照，保留 config、原始 model_name、日期、分数、区间、样本数、rank、数据集 SHA。
   - ai-model-index 的 aa-intelligence 与 SciCode 快照；aa-coding 空榜单和 LiveCodeBench 旧榜单保留为“不可用”状态。

2. 建立显式别名清单：

   - Copilot ID ↔ models.dev canonical ID。
   - Copilot ID + reasoning profile ↔ LMArena `model_name`。
   - Copilot ID + reasoning profile ↔ ai-model-index `slug`。
   - 每个别名附证据 URL 和核对日期；无人工确认的条目不允许匹配。

3. 先实现表格数据层和来源审计字段，再实现 UI：

   - 默认 base-tier 价格、cached input 可关、过滤、Pin、来源快照日期。
   - 当前/退役模型分区按控制器决定处理。

4. 能力预测只使用已冻结的行数据，并逐项生成“来源 → 指标 → 推断 → 置信度”的解释。缺列时显示 `—`，协作情商显示「无可信数据」。

5. 最后补手动更新和 localStorage：缓存规范化后的 Copilot 子集及快照元数据，不缓存完整大响应；刷新失败时保留上次快照并显示其日期。
