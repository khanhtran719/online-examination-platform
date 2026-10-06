module.exports = {
  preset: "ts-jest",
  watchman: false,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["**/__tests__/*.unit.spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          ...require("./tsconfig.json").compilerOptions,
          rootDir: ".",
          module: "ESNext",
        },
        diagnostics: true,
      },
    ],
  },
};
