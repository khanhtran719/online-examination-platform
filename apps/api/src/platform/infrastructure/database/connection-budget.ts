import { readFileSync } from "node:fs";
import { connectionBudget, ConnectionBudget } from "./database-config";

try {
  const path = process.argv[2];
  if (!path) throw new Error("Budget file required");
  const budget = JSON.parse(readFileSync(path, "utf8")) as ConnectionBudget;
  process.stdout.write(
    JSON.stringify({
      event: "database.connection_budget",
      ...connectionBudget(budget),
    }) + "\n",
  );
} catch {
  process.stderr.write("Invalid or exhausted connection budget.\n");
  process.exitCode = 1;
}
