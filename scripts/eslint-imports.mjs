import { builtinModules } from "node:module";

// Shared policy; each application owns its plugin dependency and parser settings.
export const importRules = {
  "no-restricted-imports": [
    "error",
    {
      paths: builtinModules
        .filter((name) => !name.startsWith("node:"))
        .map((name) => ({ name, message: "Use the explicit node: built-in specifier." })),
    },
  ],
  "padding-line-between-statements": [
    "error",
    { blankLine: "always", prev: "import", next: "*" },
    { blankLine: "any", prev: "import", next: "import" },
  ],
  "simple-import-sort/imports": [
    "error",
    {
      groups: [
        ["^\\u0000"],
        ["^node:"],
        ["^@?\\w"],
        ["^@(?:shared|config|infrastructure|identity|catalog|reporting|web)(?:/|$)", "^"],
        ["^\\.\\.(?:/|$)"],
        ["^\\./", "^\\.$"],
      ],
    },
  ],
  "simple-import-sort/exports": "error",
  "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports", fixStyle: "separate-type-imports", disallowTypeAnnotations: false },
  ],
};
