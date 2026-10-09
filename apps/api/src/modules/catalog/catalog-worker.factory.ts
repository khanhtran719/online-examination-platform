import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { PostgresCatalogQuery } from "./infrastructure/persistence/postgres-catalog.query";
import { CatalogAccess } from "./application/facades/catalog.facade";

/** Trusted scoring only: no Identity/session keys or full HTTP service composition. */
export function createScoringCatalog(
  db: PostgresDatabase,
): Pick<CatalogAccess, "getScoringSnapshot"> {
  const query = new PostgresCatalogQuery(db);
  return {
    getScoringSnapshot: async (id) => {
      const snapshot = await query.scoring(id);
      if (!snapshot) throw new Error("SCORING_SNAPSHOT_UNAVAILABLE");
      return snapshot;
    },
  };
}
