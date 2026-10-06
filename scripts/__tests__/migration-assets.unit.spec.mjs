import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyMigrationBundle } from "../migration-assets.mjs";

test("packages immutable SQL bytes and ordered filenames independently of process cwd", async () => {
  const root = await mkdtemp(join(tmpdir(), "examination-assets-"));
  try {
    const source = join(root, "source"),
      output = join(root, "artifact", "migrations");
    await mkdir(source);
    const sql = Buffer.from("-- UTF8: dữ liệu\nSELECT 1;\r\n");
    await writeFile(join(source, "0001_initial.sql"), sql);
    await writeFile(join(source, "0002_grants.sql"), "SELECT 2;\n");
    await writeFile(join(source, "README.md"), "Not a migration");
    await copyMigrationBundle(source, output);
    assert.deepEqual((await readdir(output)).sort(), ["0001_initial.sql", "0002_grants.sql"]);
    assert.deepEqual(await readFile(join(output, "0001_initial.sql")), sql);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("fails build rather than silently packaging missing or symlinked migrations", async () => {
  const root = await mkdtemp(join(tmpdir(), "examination-assets-"));
  try {
    await assert.rejects(copyMigrationBundle(join(root, "missing"), join(root, "output")));
    await mkdir(join(root, "source"));
    await writeFile(join(root, "external.sql"), "SELECT 1;");
    await symlink(join(root, "external.sql"), join(root, "source", "0001_initial.sql"));
    await assert.rejects(copyMigrationBundle(join(root, "source"), join(root, "output")));
  } finally {
    await rm(root, { recursive: true });
  }
});
