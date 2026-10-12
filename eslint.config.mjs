import simpleImportSort from "eslint-plugin-simple-import-sort";
import ts from "typescript-eslint";

import { importRules } from "./scripts/eslint-imports.mjs";

export default ts.config(
  { ignores: ["dist/**", "node_modules/**", "apps/web/**"] },
  ...ts.configs.recommended,
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    plugins: { "simple-import-sort": simpleImportSort },
    languageOptions: {
      parserOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
    },
    rules: {
      ...importRules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
