module.exports = {
  preset: "ts-jest",
  watchman: false,
  testEnvironment: "node",
  testMatch: ["**/__tests__/*.unit.spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          ...require("./tsconfig.json").compilerOptions,
          rootDir: ".",
        },
        diagnostics: true,
      },
    ],
  },
};
