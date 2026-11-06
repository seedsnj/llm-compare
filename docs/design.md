# 系统设计

- 最后更新：2026-11-06
- 文档版本：2.1.0

## 1. 总体架构

应用是单页纯前端 Browser App：

```text
models.dev API ───────┐
内置 pricing snapshot ├─> 规范化 Copilot 模型 ─┐
localStorage 定价缓存 ┘                        │
                                               ├─> 派生 insights ─> React UI
capability snapshot（LMArena + AA）────────────┤
benchmark snapshot（TB/SWE/Claw/Long/Email）───┘
```

浏览器负责：

1. 读取内置或缓存快照。
2. 手动更新 models.dev 价格。
3. 规范化模型数据。
4. 计算参考成本、Profile、性价比和能力预测。
5. 渲染表格、Pin、筛选、排序与详情。

不存在后端、数据库或服务端代理。

## 2. 目录结构

```text
.
├── docs/                          # 当前有效的长期文档
├── reports/                       # 历史阶段报告与调研原始记录
├── scripts/
│   ├── build-test-fixture.mjs     # 从规范化快照建立日期化测试固件
│   └── refresh-snapshots.mjs      # 刷新 pricing 与 capability 快照
├── src/
│   ├── components/
│   │   ├── CapabilityPanel.tsx    # Pin 对比、Profile 详情、任务预测
│   │   └── PricingTable.tsx       # 主数据表
│   ├── data/
│   │   ├── benchmark-snapshot.json
│   │   ├── capability-snapshot.json
│   │   └── pricing-fallback.json
│   ├── lib/
│   │   ├── insights.ts            # 成本、能力归一化、Profile、性价比
│   │   ├── models.ts              # models.dev 规范化、格式化
│   │   └── predictions.ts         # 五类任务证据与预测
│   ├── App.tsx                    # 状态、筛选、排序、缓存、页面组装
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── tests/
│   ├── fixtures/
│   │   └── 2026-11-06/
│   └── fixtures.test.mjs
├── start-web.sh                   # 一键启动 Vite
└── package.json
```

## 3. 组件职责

### `App.tsx`

- 持有定价快照、Pin、过滤、排序、选中模型和更新状态。
- 调用 `normalizeModelsDevPayload` 与 `buildModelInsights`。
- 处理 localStorage、手动更新、当前/退役模型切换。
- 将派生结果传给主表和详情区。

### `PricingTable.tsx`

- 渲染紧凑价格表。
- 展示价格条、三维 Profile、coverage、证据类型和性价比。
- 控制缓存列的条件渲染。
- 展示排序状态、Pin/Hover/选中状态。

### `CapabilityPanel.tsx`

- Pin 模型的任务能力横向对比。
- 选中模型的 Profile 证据卡片。
- 五类任务的描述、推断逻辑、来源和置信度。
- 原始能力匹配抽屉。

### `insights.ts`

- 参考会话成本与 Credits。
- 输入、输出、缓存价格的对数条。
- 成本四分位梯队。
- 直接 benchmark、legacy benchmark 和 LMArena 代理的组合。
- Profile coverage、置信度和综合性价比。

### `predictions.ts`

- 将已有能力证据解释为五类任务预测。
- 输出预测摘要、逻辑、来源和置信度。
- 对“日常协作情商”固定返回「无可信数据」。

## 4. 数据流

### 4.1 初始加载

1. 尝试读取 `copilot-pricing-snapshot-v1`。
2. 读取失败或结构异常时使用内置 `pricing-fallback.json`。
3. 读取 Pin。
4. 使用当前 pricing、capability、benchmark 三个快照计算 insights。
5. 默认按综合性价比降序展示当前有效模型。

### 4.2 手动价格更新

1. 请求 `https://models.dev/api.json`。
2. 提取 `github-copilot.models`。
3. 规范化模型 ID、供应商、价格、上下文、状态和 canonical ID。
4. 校验至少解析出 15 个模型。
5. 更新 React 状态。
6. 将规范化子集写入 localStorage。
7. 重新计算 Profile 与性价比。

能力快照与 Benchmark 快照不会由页面实时请求。

## 5. 数据源与快照

### 定价

- 运行时主源：models.dev JSON API。
- 缓存：只保存 `github-copilot` 子集。
- GitHub 官方 YAML：Stage 0 人工核对基准，不在浏览器中解析。
- LiteLLM：调研交叉核对源，不做运行时依赖。

### 能力

- `capability-snapshot.json` 保存 LMArena、AA Intelligence、SciCode、LiveCodeBench 等行的规范化结果。
- LMArena 行 API 无第三方浏览器 CORS，因此必须使用静态快照。
- ai-model-index raw JSON 支持 CORS，但为了结果可复现仍使用固定快照。

### Benchmark Profile

`benchmark-snapshot.json` 保存：

- Terminal-Bench 4.0 与 2.0；
- SWE-bench Verified；
- LongCLI-Bench；
- ClawMark；
- EmailBench。

每条结果保留 Copilot 模型 ID、原始模型名、原始分数、harness、reasoning effort、发布或模型日期和来源 URL。

当前刷新脚本只更新 pricing 与 capability；Benchmark 快照需要人工核对后更新。

## 6. 本地状态与持久化

| 状态 | 位置 | 是否持久化 |
| --- | --- | --- |
| 定价快照 | React + localStorage | 是 |
| Pin IDs | React + localStorage | 是 |
| 当前筛选词 | React | 否 |
| 当前排序 | React | 否 |
| 是否显示缓存列 | React | 否，每次启动默认关闭 |
| 是否显示退役模型 | React | 否，每次启动默认关闭 |
| 选中模型 | React | 否 |

localStorage key：

```text
copilot-model-pins-v1
copilot-pricing-snapshot-v1
```

所有存储操作均使用 try/catch。浏览器禁用存储或空间不足时，React 状态继续工作。

## 7. 当前/退役模型

- 默认列表只包含 `deprecated !== true` 的模型。
- 打开“包含已退役模型”可查看历史数据。
- GPT-5.5 在快照中仍保留，但标记为已退役。
- 退役模型可使用相同 Profile 计算展示历史信息，但不会成为当前「值选」。

## 8. 表格与视觉设计

### 价格

- 原始金额为权威值。
- 条形使用对数刻度表现数量级。
- 参考成本额外显示 Credits。

### Profile

- 高难、通用、日常各有一个紧凑分数条。
- 实色表示 direct。
- 点状纹理表示 legacy。
- 斜纹表示 proxy。
- Profile 汇总列显示 20/60/20 三段条、coverage、直接指标数和置信度。

### 状态

- Pin：暖黄色背景、实心星和 `PIN` 标签。
- 普通 Hover：冷灰蓝背景。
- 选中：深色内描边。
- 值选：绿色徽标与绿色价值条。
- 无数据：灰色虚线框和明确文本。

## 9. 排序规则

1. Pin 模型整体优先。
2. Pin 与非 Pin 两组内部应用当前排序字段。
3. 文本字段使用本地化比较。
4. 数字字段按数值比较。
5. null/undefined 值在升序和降序都放在末尾。
6. 默认排序字段为综合性价比降序。

## 10. 响应式与可访问性

- 页面宽度自适应，主表在 `.table-frame` 内横向滚动。
- 窄屏下控制区和详情卡片改为纵向布局。
- 表头使用 `aria-sort`。
- Pin 使用 `aria-pressed`。
- 输入框有可见 label。
- Tooltip 说明派生指标口径。
- 颜色不是唯一的信息载体；同时存在文字、纹理、数字和徽标。
- 所有文本/背景保持可读对比度。

## 11. 错误处理

- 缓存 JSON 损坏：回退内置快照。
- models.dev 请求失败：保留当前数据并显示错误。
- localStorage 写入失败：当前会话继续使用内存中的数据。
- 价格、维度或成本中位数不足以计算：输出「无数据 / 无法评估」。
- Benchmark 无法精确匹配：不生成 Profile 或该维度。

## 12. 部署边界

- 必须通过 HTTP 提供 `index.html`。
- 直接打开 `file://` 会阻止 Vite TypeScript 模块加载。
- 启动脚本默认监听 `127.0.0.1:5173`。
- 可用 `WEB_HOST`、`WEB_PORT` 覆盖监听地址和端口。

## 13. 技术决策与取舍

本节合并原 `decisions.md`，是设计和实现共同遵循的决策记录。

### 13.1 技术栈

- 使用 Vite + React + TypeScript，不引入后端。
- 数据量、筛选和排序均可在浏览器完成。
- 必须通过 HTTP 打开，因此提供 `start-web.sh`。
- Vite 构建不执行完整类型检查；项目未安装 React 类型包，这是 4 个直接依赖上限下的取舍。

### 13.2 依赖预算

当前直接依赖：

```text
react
react-dom
vite
typescript
```

不使用 React 插件、状态管理库、图表库、HTML 解析库或 axios。收益是部署简单、依赖小；代价是没有 Fast Refresh 专用插件和项目内 `tsc` 类型检查。

### 13.3 定价数据

- models.dev 是运行时主源，因为它是可直接消费的 JSON 且支持 CORS。
- localStorage 只保存 GitHub Copilot 规范化子集。
- `status === "deprecated"` 用来区分当前和退役模型。
- GitHub Docs HTML 不解析。
- GitHub 官方 YAML 仅作人工核对基准。
- LiteLLM 只用于调研和交叉核对，不进入运行时。

### 13.4 能力与 Benchmark 数据

- LMArena 行 API 缺少第三方浏览器 CORS，所以使用带 revision 的静态快照。
- ai-model-index 与 capability 数据同样固定为快照，保证结果可复现。
- Benchmark 数据使用人工核对的静态快照，避免运行时抓取 HTML。
- `npm run snapshots:refresh` 只更新 pricing 与 capability，不更新 benchmark。
- Benchmark 更新必须重新核对来源、版本、Agent harness、effort 和模型映射。

### 13.4.1 测试固件

- `scripts/build-test-fixture.mjs` 从当前三份规范化快照生成日期化固件。
- `npm test` 使用 Node 内置 test runner，不需要网络或额外依赖。
- 固件 manifest 记录来源、capturedAt、文件大小和 SHA-256。
- 线上刷新与离线测试分离；测试只读取已提交固件。

### 13.5 精确匹配

- 模型关系通过快照中的显式 `modelId` 建立。
- 不采用包含匹配、编辑距离或代际继承。
- 不同 reasoning effort、fast 或 harness 不被自动合并。
- 无法精确匹配时显示 `—`、无数据或无可信 Profile。

### 13.6 UI 决策

- 不使用雷达图或图表库。
- 使用表格、数值、CSS 条和纹理表达差异。
- 实色表示 direct，点纹表示 legacy，斜纹表示 proxy。
- Pin、Hover、选中和值选使用不同色系及文字标识。
- 缓存输入列采用条件渲染，关闭时整个列不进入 DOM。

### 13.7 成本模型

参考会话固定为：

```text
100,000 input + 12,000 output tokens
```

参考成本不包含缓存折扣。该方法可解释、可排序，但不是账单预测，也不能代表所有用户的 token 分布。

### 13.8 Profile 模型

- 高难度 20%、通用开发 60%、日常信息 20%。
- 数据优先级按直接 benchmark、legacy benchmark、LMArena proxy 排列。
- 至少两个维度且 coverage ≥ 80% 才计算 Profile。
- 缺失维度不补零。
- 完整性通过 coverage 和 direct 指标数同时表达。

### 13.9 性价比模型

- 只有 coverage 100% 且至少一个直接维度的模型参与排名。
- 80% 部分 Profile 和纯代理 Profile 不参与。
- 成本中位数必须大于 0，否则不计算。
- 前三名显示「值选」。

### 13.10 基准选择

| 决策 | 原因 | 后果 |
| --- | --- | --- |
| Terminal-Bench 4.0 优先于 2.0 | 4.0 当前覆盖率 18/27，2.0 仅 3/27 | 2.0 标记 legacy，不与 4.0 混为同一版本 |
| SWE-bench Verified 为通用开发主源 | 接近仓库级修复任务 | 当前仅 1/27，因此多数模型回退 Webdev 代理 |
| ClawMark 为日常主源 | 测量多日、多工具办公协作 | 当前仅 1/27，多数模型回退 Document/Text 代理 |
| LongCLI-Bench 不参与 Profile | 只有 1 个当前模型、无机器可读总榜且区分度弱 | 仅作诊断证据 |
| EmailBench 不参与 Profile | 邮件安全 MCQA，不是办公执行，且接近饱和 | 仅作诊断证据 |

### 13.11 已取代的设计

Stage 2 曾使用：

```text
normalized Webdev / adjusted cost
```

该算法系统性偏向便宜的前端模型，无法表达复杂开发任务。Stage 3 已用 20/60/20 Profile 取代。Stage 2 报告保留作历史记录，但当前实现不包含该价值公式。
