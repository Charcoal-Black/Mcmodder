// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: [
      "src/widget/Splash3D.ts",
      "src/main.ts"
    ], // 祖传代码，重构前豁免
    rules: {
      "no-empty": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off"
    }
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
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: [
      "src/Mcmodder.ts",
      "src/init/EditorInit.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-constant-condition": "off" // mcmodderSettings.mcmodderUI = true
    }
  },
  prettierConfig
]);