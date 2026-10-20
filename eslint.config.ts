// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vue from "eslint-plugin-vue";
import importPathCasing from "./eslint-local-rules/import-path-casing";

export default defineConfig([
  {
    files: ["**/*.{js,ts}"],
    ignores: ["dist/*"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // 与 tsc 的 noUnusedLocals/noUnusedParameters 对齐：`_` 前缀表示有意不使用
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // 大小写校验独立成块：`.vue` 也要覆盖，故不能并入上面的 js/ts 块
    files: ["**/*.{js,ts,vue}"],
    ignores: ["dist/*"],
    plugins: { local: { rules: { "import-path-casing": importPathCasing } } },
    rules: { "local/import-path-casing": "error" },
  },
  {
    files: ["src/**/*.vue"],
    // TS 规则放在 vue 配置之前：vue 的 flat 配置要负责外层 parser，后写的才生效
    extends: [...tseslint.configs.recommended, vue.configs["flat/recommended"]],
    languageOptions: {
      // <script lang="ts"> 交给 TS 解析器，模板则由 vue-eslint-parser 处理
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      "vue/multi-word-component-names": [
        "error",
        {
          ignores: ["Countdown", "Collapsible", "Pagination", "Popover"],
        },
      ],
      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      // 与 tsc 的 noUnusedLocals/noUnusedParameters 对齐：`_` 前缀表示有意不使用
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,vue}"],
    rules: {
      /**
       * 禁用「浏览器全局函数」的裸调用。
       *
       * `close` / `open` / `print` / `stop` 都是 `window` 上的全局函数，
       * 而 TypeScript 的 lib.dom.d.ts 里有同名的全局声明（`declare function close(): void`），
       * 所以局部忘了一次声明时，TS 不会报错——调用会静悄悄地落到 `window` 上：
       * `close()` 真的会关掉当前标签页（userscript 沙箱里也一样），
       * `open()` 会开新标签页，`print()` 会弹打印框，`stop()` 会掐掉页面加载。
       *
       * 本规则只拦「解析到全局作用域」的裸调用：
       * - 局部遮蔽（`const { close } = usePopoverHost()`）不受影响；
       * - 显式写出宿主对象（`window.close()`）也不受影响——真要用的时候写明白就好。
       */
      "no-restricted-globals": [
        "error",
        {
          name: "close",
          message:
            "close 是 window.close，会关掉当前标签页；请用局部变量遮蔽，或显式写成 window.close()。",
        },
        {
          name: "open",
          message:
            "open 是 window.open，会打开新标签页；请用局部变量遮蔽，或显式写成 window.open()。",
        },
        {
          name: "print",
          message:
            "print 是 window.print，会弹出打印对话框；请用局部变量遮蔽，或显式写成 window.print()。",
        },
        {
          name: "stop",
          message:
            "stop 是 window.stop，会中止页面加载；请用局部变量遮蔽，或显式写成 window.stop()。",
        },
      ],
    },
  },
  {
    files: ["src/widget/Splash3D.ts", "src/main.ts"], // 祖传代码，重构前豁免
    rules: {
      "no-empty": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },
  {
    files: [
      "src/Mcmod.d.ts", // MCMOD
      "src/echarts/EChartsUtils.ts", // ECharts
      "src/requestqueue/*.ts", // 网络通信
      "src/init/center/CenterHomeInit.ts", // 依旧 ECharts
      "src/ueditor/AdvancedUEditor.ts", // UEditor
      "src/ueditor/UEditor.ts", // 依旧 UEditor
      "src/vue/mount.ts", // Vue
      "src/vue/composables/useConfig.ts", // 依旧 Vue
      "src/config/ConfigRepository.ts", // TS 自身限制，难以避免 any
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/Mcmodder.ts", "src/init/EditorInit.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-constant-condition": "off", // mcmodderSettings.mcmodderUI = true
    },
  },
  prettierConfig,
]);
