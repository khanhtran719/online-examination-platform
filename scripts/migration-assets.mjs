import { readdir, mkdir, copyFile, lstat } from "node:fs/promises";
import { join } from "node:path";
export async function copyMigrationBundle(source, destination) {
  const entries = (await readdir(source)).filter((name) => name.endsWith(".sql")).sort();
  if (!entries.length) throw new Error("Missing migration bundle");
  await mkdir(destination, { recursive: true });
  for (const name of entries) {
    const info = await lstat(join(source, name));
    if (!/^\d{4}_[a-z0-9_-]+\.sql$/.test(name) || !info.isFile() || info.isSymbolicLink())
      throw new Error("Invalid migration asset");
    await copyFile(join(source, name), join(destination, name));
  }
}
