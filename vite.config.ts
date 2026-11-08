import { defineConfig } from "vite";

export default defineConfig({
  base: "/llm-compare/",
  esbuild: {
    jsx: "automatic",
  },
});

