module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["<rootDir>/apps/api/tests/integration/*.spec.ts"],
  testTimeout: 30000,
};
