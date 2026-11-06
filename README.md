# GitHub Copilot 模型对比

纯前端 React + TypeScript 应用，比较 GitHub Copilot 模型的用量计费价格和五类开发任务的能力代理。

## 运行

不要直接打开 `index.html`。Vite 需要通过 HTTP 提供 TypeScript 模块：

```bash
npm install
npm run dev
```

打开终端显示的本地地址，通常为 `http://localhost:5173/`。

生产构建：

```bash
npm run build
npm run preview
```

## 数据

- 定价：models.dev API，页面内“更新价格”会刷新数据并写入 localStorage。
- 能力：`src/data/capability-snapshot.json`，来源为 LMArena 与 Artificial Analysis（经 ai-model-index）。
- 数据快照刷新：`npm run snapshots:refresh`。

LMArena rows API 不提供适合第三方浏览器调用的 CORS 头，因此能力数据使用带数据集 revision 的静态快照。无法精确匹配的数据显示 `—` 或「无可信数据」。
