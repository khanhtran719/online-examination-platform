import { validateMigrationSql } from "../migration-runner";

describe("migration transaction ownership", () => {
  it.each([
    "BEGIN; SELECT 1;",
    "SELECT 1; COMMIT;",
    "SET ROLE unsafe;",
    "RESET ALL;",
    "DISCARD ALL;",
  ])("rejects top-level control: %s", (sql) => {
    expect(() => validateMigrationSql(sql)).toThrow("transaction/session");
  });
  it("allows PL/pgSQL bodies and quoted/commented control words", () => {
    expect(() =>
      validateMigrationSql(
        "-- BEGIN;\nCREATE FUNCTION platform.fixture() RETURNS void LANGUAGE plpgsql AS $body$ BEGIN RETURN; END $body$; SELECT 'COMMIT;';",
      ),
    ).not.toThrow();
  });
});
