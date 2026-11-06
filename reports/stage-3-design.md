# Stage 3：Benchmark Profile 与综合性价比

- 最后更新：2026-11-06
- 文档版本：1.0.0

调研日期：2026-11-06

## 结论摘要

- 原 `capability-snapshot.json` 不包含 Terminal-Bench、SWE-bench、LongCLI-Bench、ClawMark 或 EmailBench 字段，因此仅凭旧静态快照，这些基准的覆盖率都是 `0/27`。
- 实际公开数据也不足以对 27 个当前模型做完整 Benchmark Profile：Terminal-Bench 2.0 覆盖 `3/27`，SWE-bench Verified 和 LongCLI-Bench 各覆盖 `1/27`。
- Terminal-Bench 已迭代到 4.0，当前官方榜单覆盖 `18/27` 个有效模型，明显优于 2.0，因此采用 4.0 作为高难度主基准，2.0 仅作历史后备。
- ClawMark 和 EmailBench 各只覆盖 `1/27`。ClawMark 作为日常办公的直接后备；EmailBench 是邮件安全 MCQA，不是实际办公执行，且接近饱和，因此只作为诊断数据，不进入 Profile。
- 单 Webdev 性价比已替换为三维 Profile：高难度 20%、通用开发 60%、日常信息 20%。直接 benchmark 优先，LMArena 只作明确标记的代理。
- 当前快照得到 18 个完整 Profile、7 个 80% 部分 Profile、2 个无 Profile；16 个模型进入综合性价比排名。

## 候选基准数据可行性

### 数据形态

| 来源 | 实际数据形态 | 当前有效模型覆盖 | 处理决定 |
| --- | --- | ---: | --- |
| Terminal-Bench 2.0 | Harbor Hub 官方表格，142 行，字段含 Agent、Model、日期、准确率和 95% CI | `3/27` | 历史后备 |
| Terminal-Bench 4.0 | tbench.ai 官方排行榜，23 行；底层结果 JSON 含 `accuracy`、Agent、effort、tokens 和成本 | `18/27` | 高难度主源 |
| SWE-bench Verified | 官方页面内嵌 JSON，180 条结果和 89 个模型显示名；字段含 `agent`、`model_display`、`resolved`、日期、trajectory | `1/27` | 通用开发主源 |
| LongCLI-Bench | 官方仓库只有结果图片表，无模型结果 JSON/API；表中有 Pass、Pass@3、F2P/P2P Step Score | `1/27` | 不进入 Profile |
| ClawMark | README 有 7 个模型的 100-task 排行榜；任务目录只有单任务 `result.json`，没有全局机器可读 summary | `1/27` | 日常信息主源 |
| EmailBench | Hugging Face 数据集与结果柱状图；312 道邮件安全 MCQA；前沿模型接近 1.00 | `1/27` | 不进入 Profile |

### 完整当前模型覆盖矩阵

`TB4 / TB2` 单位是 Terminal-Bench resolution rate，`SWE` 是 resolved rate，`LongCLI` 是 Pass rate，`Claw` 是 avg score，`Email` 是准确率。`—` 表示没有可精确匹配数据。

| 当前模型 | TB4 | TB2 | SWE Verified | LongCLI | ClawMark | EmailBench |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 64.8% | — | — | — | — | — |
| Gemini 3.8 Flash | 19.1% | — | — | — | — | — |
| GPT-5.6 Luna | 17.3% | — | — | — | — | — |
| Claude Sonnet 5 | 12.4% | — | — | — | — | — |
| GPT-6 Luna | 16.4% | — | — | — | — | — |
| Claude Fable 5 | 44.5% | — | — | — | — | — |
| GPT-5.6 Terra | 21.5% | — | — | — | — | — |
| GPT-6.1 Terra | — | — | — | — | — | — |
| Gemini 4 Argon | — | — | — | — | — | — |
| Grok 4.7 | 37.6% | — | — | — | — | — |
| Kimi K3 | — | — | — | — | — | — |
| Claude Haiku 5.5 | — | — | — | — | — | — |
| Grok 4.5 | 12.4% | — | — | — | — | — |
| GPT-5.4 nano | — | — | — | — | — | — |
| Claude Fable 5.1 | 57.9% | — | — | — | — | — |
| Grok 4.6 | 20.3% | — | — | — | — | — |
| GPT-6 Astra | 58.2% | — | — | — | — | — |
| MAI-Code-1.1-Flash | — | — | — | — | — | — |
| GPT-6 Sol | 49.4% | — | — | — | — | — |
| Claude Opus 4.8 | 23.6% | — | — | — | — | — |
| Claude Sonnet 5.5 | 61.8% | — | — | — | — | — |
| GPT-5.6 Sol | 37.3% | — | — | — | — | — |
| Claude Haiku 4.5 | — | 35.5% | 66.6% | — | — | 99.7% |
| GPT-5.3 Codex | — | 78.4% | — | 15.0% | — | — |
| Claude Opus 5 | 53.9% | — | — | — | — | — |
| Claude Sonnet 4.6 | — | 53.4% | — | — | 75.8% | — |
| GPT-6.1 Sol | 58.2% | — | — | — | — | — |

退役模型 GPT-5.5 在 Terminal-Bench 2.0 有最高 `84.7%` 记录，但默认当前列表不包含它。

### 精确匹配数量

- Terminal-Bench 2.0：15 行对应 3 个当前模型。
  - GPT-5.3 Codex：9 行，最高 78.4%，Agent 为 SageAgent。
  - Claude Sonnet 4.6：1 行，53.4%，Agent 为 SimplAI Agent。
  - Claude Haiku 4.5：5 行，最高 35.5%，Agent 为 Goose。
- Terminal-Bench 4.0：18 个当前模型各 1 行。
- SWE-bench Verified：180 条结果中仅 Claude Haiku 4.5 的 mini-SWE-agent 结果可精确匹配，resolved 为 66.6%。
- LongCLI-Bench：9 个 Agent/Model 行中，当前模型仅 GPT-5.3 Codex，Pass 15.0%、Pass@3 20.0%。
- ClawMark：7 个模型中，当前模型仅 Claude Sonnet 4.6，avg score 0.758。
- EmailBench：前沿模型中仅 Claude Haiku 4.5 属于当前列表，准确率 0.997。

## Profile 设计

### 维度与权重

```text
高难度 20% + 通用开发 60% + 日常信息 20%
```

权重来自本轮提供的真实开发任务难度分布。所有维度转换为 `0–100` 后参与计算。

### 数据降级链

| 维度 | 第一优先 | 第二优先 | 第三优先 |
| --- | --- | --- | --- |
| 高难度 | Terminal-Bench 4.0 | Terminal-Bench 2.0，legacy | LMArena Agent 代理 |
| 通用开发 | SWE-bench Verified | LMArena Webdev 代理 | 无 |
| 日常信息 | ClawMark | LMArena Document 代理 | LMArena Text 代理 |

不进入 Profile 的候选：

- LongCLI-Bench：只有 1 个当前模型、无机器可读总榜，且官方结果整体低于 20%，无法支撑横向比较。
- EmailBench：测量邮件安全知识 MCQA，不测量多步骤办公执行，且前沿模型饱和。

### 计算

对每个模型：

```text
observedWeight = 所有有数据维度权重之和
coverage = observedWeight × 100

profileScore =
  Σ(维度权重 × 维度分数) / observedWeight
```

仅当：

```text
coverage >= 80
且至少存在两个维度
```

才输出 Profile。缺失维度不补零、不填平均值，只显示「无数据」并降低 coverage。

### 证据等级

- `direct`：Terminal-Bench 4.0、SWE-bench Verified、ClawMark。
- `legacy`：Terminal-Bench 2.0。
- `proxy`：LMArena Agent、Webdev、Document、Text。
- 直接基准使用实色能力条；历史直接基准使用点状纹理；代理使用斜纹。
- 完整覆盖且至少一个直接维度才可参与性价比。
- 完整覆盖但全部为代理时显示「仅代理」，不参与性价比排名。

置信度：

- 完整覆盖 + 至少两个直接维度：中低。
- 完整覆盖 + 一个直接维度：低。
- 80% 部分覆盖：低，并显示缺失维度。
- 完整覆盖但零 direct：仅代理。
- coverage 低于 80%：无可信 Profile。

## 综合性价比

参考成本继续使用：

```text
referenceCost = inputPrice × 0.1 + outputPrice × 0.012
```

即一次参考会话包含 100,000 input 和 12,000 output tokens，不含缓存折扣。

```text
medianCost =
  完整 Profile 且至少一个 direct 维度的有效模型成本中位数

valueIndex =
  profileScore / (1 + referenceCost / medianCost)
```

防误导措施：

- 80% 部分 Profile 不进入性价比排序。
- 仅由 LMArena 代理组成的完整 Profile 不进入性价比排序。
- 无数据模型显示「无法评估」，不按 0 分或最便宜模型处理。
- 市场无有效候选、成本中位数为 0 或 Profile 为空时，整个性价比结果返回不可计算。
- 当前快照有 16 个模型进入性价比排名；前三名为 Claude Sonnet 5.5、GPT-6.1 Sol、Claude Opus 5.5。

## UI 呈现

主表保留紧凑布局，并将原先四个分散能力列改为：

```text
高难 20% | 通用 60% | 日常 20% | Profile | 综合性价比
```

- 每个维度显示 0–100 分数、来源缩写和纯 CSS 能力条。
- 直接基准用实色，legacy 用点状纹理，代理用斜纹；用户无需打开详情即可看出证据类型。
- Profile 显示加权分、三段 20/60/20 竖条、coverage、direct 数量和置信度。
- 部分 Profile 明确显示 `80% 覆盖`；无数据模型显示「无可信 Profile」。
- 性价比只对有资格的模型显示「值选 / 高效 / 一般 / 偏低」。
- Tooltip 展示来源名、harness、reasoning effort、发布日期和代表模型。
- 选中模型详情区展示三个维度卡片、所有降级来源和原始数据链接。
- 不采用雷达图；继续使用表格、数值与 CSS 条形。

## 视觉状态

- Pin：暖黄色行底、实心星和 `PIN` 标签。
- 普通 Hover：冷灰蓝行底。
- 选中：深色内描边，不覆盖 Pin 的暖色状态。
- Profile direct：实色。
- Profile legacy：点状纹理。
- Profile proxy：斜纹。
- 无数据：灰色虚线框，不画零长度能力条。

## 技术风险与妥协

1. **Agent harness 混淆**

   Terminal-Bench、SWE-bench 和 LongCLI 都是 Agent + Model + Harness 的系统结果，不是纯模型分数。UI 必须显示 harness，并避免把 profile 称为“模型绝对能力”。

2. **直接基准稀疏**

   高难度主源覆盖 `18/27`，通用和日常更多依赖代理。当前 Profile 是“直接基准优先的混合估计”，不是统一实验复测。

3. **Terminal-Bench 版本差异**

   TB 2.0 与 4.0 任务分布不同。2.0 仅用于没有 4.0 数据的历史模型，并标记 legacy；两个版本不可当作同一实验。

4. **Terminal-Bench 2.0 多 harness 偏差**

   同一模型可能有多个 Agent 行。快照使用最高已核对结果并保留 harness 信息，这会反映“最佳可观测系统能力”，不代表 Copilot 默认 harness。

5. **SWE-bench 覆盖不足**

   Verified 当前只有 1 个当前模型，无法承担 60% 权重的稳定横向比较；LMArena Webdev 代理虽然覆盖 24/27，但其构念是人类网页实现偏好。

6. **日常办公数据碎片化**

   ClawMark 只覆盖 1 个当前模型，EmailBench 构念不匹配且饱和。日常维度更多使用 LMArena Document/Text 代理，因此置信度不会高于低。

7. **权重是产品假设**

   20/60/20 来自讨论输入，不是从真实用户日志拟合出来。UI 和报告必须公开权重；未来有真实使用日志后再校准。

8. **模型名称映射**

   所有关联使用人工确认的精确映射；版本、fast、reasoning effort 或 harness 后缀不同时不得合并。

## 验证结果

- `npm run build` 通过，转换 39 个模块。
- TypeScript 检查通过。
- 当前 Profile 等级：18 个完整、7 个 80% 部分、2 个无 Profile。
- 16 个模型满足性价比资格；前三名显示「值选」。
- GPT-5.4 nano 与 MAI-Code-1.1-Flash 的三维均显示「无数据」，Profile 显示「无可信 Profile」。
- GPT-6.1 Terra 显示 80% 覆盖、0 个直接指标，性价比显示「Profile 不完整」。
- 排序高难度指标时，无数据模型被固定在末尾。
- 缓存输入列仍默认不出现在 DOM。
