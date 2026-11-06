# GitHub Copilot 模型对比

纯前端 React + TypeScript 应用，比较 GitHub Copilot 模型的用量计费价格、三维 Benchmark Profile 和五类开发任务预测。

## 运行

不要直接打开 `index.html`。Vite 需要通过 HTTP 提供 TypeScript 模块：

```bash
./start-web.sh
```

脚本会检查 Node/npm，并在缺少 `node_modules` 时运行 `npm ci`。打开终端显示的本地地址，通常为 `http://localhost:5173/`。

可通过 `WEB_HOST` 和 `WEB_PORT` 覆盖监听地址：

```bash
WEB_HOST=0.0.0.0 WEB_PORT=4173 ./start-web.sh
```

也可以手动运行：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 数据

- 定价：models.dev API，页面内“更新价格”会刷新数据并写入 localStorage。
- 能力：`src/data/capability-snapshot.json`，来源为 LMArena 与 Artificial Analysis（经 ai-model-index）。
- Benchmark Profile：`src/data/benchmark-snapshot.json`，优先使用 Terminal-Bench、SWE-bench Verified 与 ClawMark，缺失时使用明确标记的 LMArena 代理。
- 数据快照刷新：`npm run snapshots:refresh`。

LMArena rows API 不提供适合第三方浏览器调用的 CORS 头，因此能力数据使用带数据集 revision 的静态快照。无法精确匹配的数据显示 `—` 或「无可信数据」。

Profile 权重为高难度 20%、通用开发 60%、日常信息 20%。覆盖不足 80%、没有直接基准或无法安全计算成本时，不产生综合性价比排名。
