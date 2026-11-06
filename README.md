# GitHub Copilot 模型对比

- 最后更新：2026-11-06
- 文档版本：1.4.0

纯前端 Browser App，用于比较 GitHub Copilot 的用量计费价格、三维 Benchmark Profile、综合性价比和五类开发任务预测。

应用只考虑 AI Credits 用量计费，`1 credit = $0.01`，不包含旧版年度套餐倍率。

## 快速开始

不要直接打开 `index.html`。Vite 的 TypeScript 入口必须通过 HTTP 提供：

```bash
./start-web.sh
```

脚本会检查 Node/npm，并在缺少 `node_modules` 时运行 `npm ci`。默认地址为 `http://127.0.0.1:5173/`。

可覆盖监听地址：

```bash
WEB_HOST=0.0.0.0 WEB_PORT=4173 ./start-web.sh
```

手动启动：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 测试

当前测试使用 Node.js 内置 test runner，不增加项目依赖：

```bash
npm test
```

测试固件位于 `tests/fixtures/2026-11-06/`，包含当天的 Copilot 模型价格、能力档案和 Benchmark 数据，以及校验哈希和来源的 `manifest.json`。

用当前规范化快照重建固件：

```bash
FIXTURE_DATE=2026-11-06 npm run fixtures:build
```

重建前可运行 `npm run snapshots:refresh` 拉取最新 pricing/capability。

## 功能

- 当前 Copilot 模型清单，支持显示已退役模型。
- 输入、输出和可选缓存输入价格，单位 `$/1M tokens`。
- 100k input + 12k output 的参考会话成本与 Credits。
- 模型名/供应商过滤和全列排序。
- Pin 上限 3，固定在顶部并跨会话保留。
- 高难度 20% + 通用开发 60% + 日常信息 20% 的 Benchmark Profile。
- 直接 benchmark、历史 benchmark 和 LMArena 代理使用不同视觉纹理。
- 完整 Profile 且至少一个直接指标才参与综合性价比排名。
- 五类任务预测显示来源、推断逻辑和置信度。
- 无法精确匹配时显示 `—`、`无数据` 或「无可信数据」。
- 手动刷新 models.dev 价格并保存规范化子集。

## Profile 数据

| 维度 | 权重 | 优先级 |
| --- | ---: | --- |
| 高难度 | 20% | Terminal-Bench 4.0 → Terminal-Bench 2.0 → LMArena Agent |
| 通用开发 | 60% | SWE-bench Verified → LMArena Webdev |
| 日常信息 | 20% | ClawMark → LMArena Document → LMArena Text |

LongCLI-Bench 与 EmailBench 保留为诊断证据，不参与 Profile。

Profile 仅在至少两个维度且有 80% coverage 时计算。综合性价比只接受 coverage 100% 且至少一个直接 benchmark 维度的模型。

完整公式见 [算法说明](docs/algorithms.md)。

## 数据源

- 定价：`https://models.dev/api.json`
- LMArena：`lmarena-ai/leaderboard-dataset`
- AI 指数：`EvanZhouDev/ai-model-index`
- 高难与 Agent：Terminal-Bench via tbench.ai / Harbor Hub
- 通用开发：SWE-bench Verified
- 日常办公：ClawMark
- 诊断：LongCLI-Bench、EmailBench

数据文件：

- `src/data/pricing-fallback.json`
- `src/data/capability-snapshot.json`
- `src/data/benchmark-snapshot.json`

刷新 pricing 与 capability：

```bash
npm run snapshots:refresh
```

该命令不更新人工核对的 `benchmark-snapshot.json`。

LMArena rows API 不提供适合第三方浏览器调用的 CORS 头，因此能力数据使用带数据集 revision 的静态快照。Benchmark 数据同样随构建发布，避免运行时抓取和 HTML 解析。

## 技术栈与约束

- Vite 5
- React 18
- TypeScript 5
- 直接依赖 4 个，硬上限 5 个
- 无后端
- 无状态管理库
- 无图表库
- 无 HTML 解析库
- 无 axios
- 不使用雷达图

## 文档

- [文档索引](docs/README.md)
- [需求规格](docs/requirements.md)
- [系统设计与技术决策](docs/design.md)
- [算法说明](docs/algorithms.md)
- [变更日志](docs/changelog.md)
- [路线图](docs/roadmap.md)

## 历史阶段报告

- [Stage 0：数据源验证与骨架](reports/stage-0.md)
- [Stage 2：信息直观化](reports/stage-2.md)
- [Stage 3：Benchmark Profile 调研与实现](reports/stage-3-design.md)

历史报告中的单一 Webdev 性价比算法已被 Stage 3 Profile 取代；当前行为以 `docs/` 和代码为准。

## 已知限制

- Vite 构建不执行完整 TypeScript 类型检查。
- Benchmark 结果包含 Agent harness 影响，不是纯模型评测。
- 多数当前模型的通用开发或日常信息维度依赖 LMArena 代理。
- Benchmark 快照需要人工核对更新。
- 参考成本不是实际账单，且不包含缓存折扣。
