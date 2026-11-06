# 变更日志

- 最后更新：2026-11-06
- 文档版本：1.2.0

本文记录项目的主要实现与文档变更。详细需求、设计和算法分别见 `requirements.md`、`design.md` 和 `algorithms.md`。

## 2026-11-06 — Roadmap

### Added

- 新增 `docs/roadmap.md`。
- 明确当前没有已承诺但未实现的产品扩张。
- 建立 Now / Next / Candidate / Non-goals 状态。
- 记录空数据防护、缓存验证、时效提示、类型检查、CI、Benchmark 更新和 LMArena 分页等工程事项。

## 2026-11-06 — 测试固件

### Added

- 刷新当天 models.dev、ai-model-index 和 LMArena 数据。
- 新增 `tests/fixtures/2026-11-06/`：36 个模型、27 个当前模型、32 个能力档案和 6 个 Benchmark 来源。
- 新增 `manifest.json`，记录来源、capturedAt、规模、文件大小和 SHA-256。
- 新增 `scripts/build-test-fixture.mjs`。
- 新增 Node 内置 test runner 测试 `tests/fixtures.test.mjs`。

### Commands

```bash
npm test
FIXTURE_DATE=2026-11-06 npm run fixtures:build
```

## 2026-11-06 — 文档结构整理

### Changed

- 所有项目文档增加最后更新时间和文档版本。
- `implementation-log.md` 转换为本文 `changelog.md`。
- `decisions.md` 合并到 `design.md` 第 13 节“技术决策与取舍”。
- 更新根 README 和文档索引中的链接。

## 2026-11-06 — Stage 3

### Added

- 新增 Terminal-Bench、SWE-bench Verified、LongCLI-Bench、ClawMark、EmailBench 静态 Benchmark 快照。
- 新增高难度 20%、通用开发 60%、日常信息 20% 的 Profile。
- 新增 direct、legacy、proxy 三种证据类型和对应视觉纹理。
- 新增 Profile coverage、直接指标数和置信度。
- 新增基于完整 Profile 的综合性价比和“值选”资格。
- 新增 Profile 证据卡片，展示 harness、effort、日期和原始来源。

### Changed

- 单一 LMArena Webdev 性价比被三维 Benchmark Profile 取代。
- Terminal-Bench 4.0 成为高难度主源，Terminal-Bench 2.0 仅作历史后备。
- SWE-bench Verified 优先，LMArena Webdev 作为通用开发代理。
- ClawMark 优先，LMArena Document/Text 作为日常信息代理。
- LongCLI-Bench 与 EmailBench 不进入 Profile。

### 提交

```text
27e9f37 feat: add benchmark profiles and web starter
```

### 验证

- Profile：18 个完整、7 个 80% 部分、2 个无 Profile。
- 综合性价比资格：16 个模型。
- 构建、TypeScript 检查、Pin/筛选/缓存列/无数据排序通过。

## 2026-11-06 — Web 启动脚本

### Added

- `start-web.sh` 检查 Node/npm。
- 缺少 `node_modules` 时执行 `npm ci`。
- 支持 `WEB_HOST` 与 `WEB_PORT`。

### 验证

- 以 `WEB_PORT=4179` 启动，页面返回 HTTP 200。

## 2026-11-06 — Stage 2

### Added

- 价格对数条、参考会话成本和 Credits。
- 紧凑能力表、能力条和综合性价比。
- Pin、Hover、选中和值选视觉状态。
- 无数据虚线和明确状态文本。
- Tooltip 和方法说明。

### 产物

```text
reports/stage-2.md
src/lib/insights.ts
```

### 后续变化

- Stage 2 单一 Webdev 性价比已被 Stage 3 Profile 取代。

## 2026-11-06 — Stage 1

### Added

- models.dev 当前 Copilot 模型定价。
- 输入/输出价格、可选缓存输入价。
- 模型/供应商过滤与排序。
- Pin 上限 3 和 localStorage 持久化。
- 当前/退役模型切换。
- 手动价格更新。
- LMArena 与 ai-model-index 静态能力快照。
- 五类任务预测、推断逻辑和置信度。
- “日常协作情商”无可信数据处理。

## 2026-11-06 — Stage 0

### Added

- Vite + React + TypeScript 项目骨架。
- models.dev、GitHub Docs、LiteLLM、ai-model-index、LMArena 实测记录。
- GitHub 官方价格 YAML 与 models.dev 的 27 个有效模型价格核对。
- 数据源覆盖矩阵和初版项目约束。

### 产物

```text
reports/stage-0.md
package-lock.json
```

## 初始提交

```text
6777572 feat: build Copilot model comparison app
```

包含初始应用、Stage 1–2 功能、价格与能力快照、阶段报告和项目骨架。

## 维护说明

### 运行

```bash
./start-web.sh
```

### 构建

```bash
npm run build
```

### 刷新 pricing 与 capability

```bash
npm run snapshots:refresh
```

该命令不更新 `src/data/benchmark-snapshot.json`。

### 更新 Benchmark

1. 核对官方 leaderboard、版本和 harness。
2. 更新 `src/data/benchmark-snapshot.json`。
3. 更新 `capturedAt`。
4. 重新检查 Profile coverage、值选和 no-data 状态。
5. 更新本文、设计或算法文档中的日期与版本。

## 已知限制

- Vite 构建不执行完整 TypeScript 类型检查。
- Benchmark 结果包含 Agent harness 影响，不是纯模型评测。
- 多数模型依赖 LMArena 代理补齐 Profile。
- Benchmark 快照需要人工核对更新。
- 参考成本不包含缓存折扣，也不是实际账单。
