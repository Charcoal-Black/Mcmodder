import { defineConfig } from "lint-staged/config";

export default defineConfig({
  // 先跑 ESLint 自动修复，再交给 Prettier 收尾格式，避免两者互相打架
  "*.{ts,js,vue}": ["eslint --fix", "prettier --write"],
  "*.{css,html,json,md,yml,yaml}": "prettier --write",
});
