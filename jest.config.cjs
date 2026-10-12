const { pathsToModuleNameMapper } = require("ts-jest");
const { paths } = require("./tsconfig.paths.json").compilerOptions;

module.exports = {
  preset: "ts-jest",
  watchman: false,
  testEnvironment: "node",
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: "<rootDir>/" }),
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["<rootDir>/apps/api/src/**/__tests__/*.unit.spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          paths,
          ...require("./tsconfig.json").compilerOptions,
          rootDir: ".",
          module: "ESNext",
        },
        diagnostics: true,
      },
    ],
  },
};
