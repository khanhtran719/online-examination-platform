module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["**/tests/integration/*.spec.ts"],
  testTimeout: 30000,
};
