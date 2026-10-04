import { type Config } from "prettier";

const config: Config = {
  printWidth: 100,
  trailingComma: "all",
  endOfLine: "lf",
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  bracketSameLine: false,
  insertPragma: false,
  bracketSpacing: true,
  vueIndentScriptAndStyle: false,
  rangeStart: 0,
  rangeEnd: Infinity,
};

export default config;
