# 算法说明

- 最后更新：2026-11-06
- 文档版本：1.0.0

本文描述当前实现中的全部派生指标。原始定价与 benchmark 分数是权威数据；本文中的分数均为可解释的派生结果。

## 1. 数据单位

- Copilot 价格单位：美元 / 1M tokens。
- AI Credits：`1 credit = $0.01`。
- Terminal-Bench：准确率，0–100。
- SWE-bench Verified：resolved rate，0–100。
- ClawMark：0–1 平均分，转换成 0–100。
- LongCLI-Bench：Pass rate，0–100。
- EmailBench：准确率，0–100。
- LMArena rating：Bradley–Terry 分数，不是百分制。
- LMArena Agent：IPS 分数，可以为负。

## 2. 价格条

输入、输出、缓存输入和参考成本分别在自己的数据范围内生成视觉长度。

```text
barPercent =
  log1p(value / min)
  / log1p(max / min)
  × 100
```

当 `value <= 0` 或 `max <= min` 时不执行除法，返回 100 或 0 的安全视觉值。原始金额始终显示。

## 3. 参考会话成本

假设一次典型开发会话：

```text
input  = 100,000 tokens
output = 12,000 tokens
```

```text
referenceCost =
  inputPricePer1M × 100,000 / 1,000,000
  + outputPricePer1M × 12,000 / 1,000,000

= inputPricePer1M × 0.1 + outputPricePer1M × 0.012

referenceCredits = referenceCost × 100
```

缓存价格不计入参考成本，避免用户在不了解缓存命中率时得到虚假的“真实成本”。

## 4. 成本梯队

当前有效模型的参考成本按升序排列，以四分位阈值分为：

- 低成本：前 25%；
- 中成本：25%–50%；
- 高成本：50%–75%；
- 极高成本：后 25%。

该梯队是相对当前模型集合的描述，不是固定金额阈值。

## 5. 能力代理归一化

用于 Profile 的 LMArena 代理包括：

- Agent；
- Webdev；
- Document；
- Text。

每个代理指标在**当前有效 Copilot 模型中具有该指标的数据**范围内做线性归一化：

```text
proxyScore =
  (rawValue - activeMin)
  / (activeMax - activeMin)
  × 100
```

如果最大值等于最小值，则返回 100；最终结果 clamp 到 0–100。

归一化范围固定基于当前有效模型，不随搜索或 Pin 改变。

## 6. Benchmark Profile

### 6.1 权重

```text
hard   = 0.20
medium = 0.60
daily  = 0.20
```

权重来自产品假设：高难度任务 20%、中等通用开发 60%、日常文档/信息任务 20%。

### 6.2 数据降级链

```text
hard:
  Terminal-Bench 4.0
  -> Terminal-Bench 2.0 (legacy)
  -> LMArena Agent (proxy)

medium:
  SWE-bench Verified
  -> LMArena Webdev (proxy)

daily:
  ClawMark
  -> LMArena Document (proxy)
  -> LMArena Text (proxy)
```

LongCLI-Bench 与 EmailBench 标记为 `usedInProfile: false`，不出现在上述降级链中。

### 6.3 维度分数

- 直接 benchmark 分数已经是 0–100，直接 clamp。
- ClawMark 原始 0–1 分数在快照中已转换为 0–100。
- legacy benchmark 与 direct benchmark 使用同一数值尺度，但 UI 使用不同纹理。
- 代理分数按第 5 节归一化并明确标记 `kind: proxy`。

### 6.4 Coverage

```text
coverage =
  sum(weight of observed dimensions) × 100
```

缺失维度不补零、不使用平均分、不使用其他代际模型的分数。

### 6.5 Profile 分数

只有满足以下条件才计算：

```text
observedDimensions >= 2
and coverage >= 80
```

```text
profileScore =
  sum(observedWeight × dimensionScore)
  / sum(observedWeight)
```

最终结果 clamp 到 0–100。

这意味着 80% coverage 的 Profile 会使用已观测维度的权重重新归一化，同时始终显示缺失维度和 coverage，不能伪装成完整 Profile。

### 6.6 置信度

| 条件 | 标签 |
| --- | --- |
| coverage 100%，至少 2 个 direct/legacy 维度 | 中低 |
| coverage 100%，1 个 direct/legacy 维度 | 低 |
| coverage 80% | 低 |
| coverage 100%，0 个 direct/legacy 维度 | 仅代理 |
| coverage < 80% 或不足两个维度 | 数据不足 |

这里不输出“高”置信度，因为 benchmark 结果包含 harness 影响，而且多数当前模型依赖代理。

## 7. 综合性价比

### 7.1 候选资格

模型必须同时满足：

```text
profileScore != null
coverage == 100
directDimensionCount >= 1
referenceCost > 0
```

因此：

- 80% 部分 Profile 不参与；
- 纯 LMArena 代理 Profile 不参与；
- 无 Profile 或成本缺失的模型不参与。

### 7.2 成本中位数

```text
medianCost =
  median(referenceCost of eligible active models)
```

成本中位数固定基于当前有效候选模型，不随过滤或 Pin 改变。

### 7.3 价值分

```text
valueIndex =
  profileScore / (1 + referenceCost / medianCost)
```

如果没有任何候选，或 `medianCost <= 0`，不计算任何性价比值。

### 7.4 展示

- 价值条按候选中的最大 `valueIndex` 归一化到 0–100。
- 当前有效候选的前三名显示「值选」。
- 其他候选显示「高效 / 一般 / 偏低」。
- 退役模型可显示历史值，但不获得当前前三名。

## 8. 五类任务预测

Profile 与任务预测是两套不同输出：

- Profile 用于成本—能力综合比较。
- 任务预测用于解释某模型在具体工作类型上的证据强弱。

### 8.1 文档

- 有 LMArena Document：中低或低置信度。
- 只有 AA Intelligence：低置信度。
- 都没有：无可信数据。

### 8.2 架构

- Webdev、Steerability、Confirmed Success、AA Intelligence 只作代理。
- 没有架构专项 benchmark，因此最高为低置信度。

### 8.3 规范与实现

- Webdev 与 Agent 完成/纠偏信号提供实现侧证据。
- 没有需求质量和规范一致性专项数据。
- 最高为中低置信度。

### 8.4 测试与 CLI

- Bash Reliability 提供命令行执行可靠性的直接信号。
- Confirmed Success、Tool Hallucination、SciCode、LiveCodeBench 作为补充代理。
- 不声称覆盖测试设计、断言质量或 CI 配置。

### 8.5 日常协作情商

- 所有来源均不足以测量团队合作、竞争或拆台。
- LMArena Praise/Complaint 只测量单次用户反馈。
- 固定输出「无可信数据」。

## 9. 排序

### 9.1 Pin

Pin 模型整体优先。Pin 和非 Pin 两组内部继续应用当前排序字段。

### 9.2 空值

有数据模型参与正常排序；无数据模型在升序和降序中都放在末尾。

### 9.3 默认

默认按综合性价比降序。Pin 始终置顶。

## 10. 精确匹配与防篡改数据

- 模型映射只使用快照中显式写入的 Copilot `modelId`。
- 浏览器运行时不执行名称相似度匹配。
- 匹配不到时使用 `null`，再显示「无数据」。
- 不能把 0 当作缺失值，也不能把缺失值补成 0。
- benchmark 缺少 harness、effort 或日期时显示已知字段，不推断未知字段。

## 11. 当前快照示例

- 完整 Profile：18 个模型。
- 80% 部分 Profile：7 个模型。
- 无 Profile：GPT-5.4 nano、MAI-Code-1.1-Flash。
- 有性价比资格：16 个模型。
- 当前「值选」：Claude Sonnet 5.5、GPT-6.1 Sol、Claude Opus 5.5。

具体数字会随定价或快照更新变化，计算规则不变。
