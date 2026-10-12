import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import ts from "typescript-eslint";

import { importRules } from "../../scripts/eslint-imports.mjs";

export default ts.config(
  {
    ignores: [
      "dist/**",
      "dist-demo/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...ts.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks, "simple-import-sort": simpleImportSort },
    rules: {
      ...importRules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
