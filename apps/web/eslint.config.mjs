import reactHooks from "eslint-plugin-react-hooks";
import ts from "typescript-eslint";

export default ts.config(
  { ignores: ["dist/**", "dist-demo/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  ...ts.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
