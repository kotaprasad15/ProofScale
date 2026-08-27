import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema/index.js";
import path from "node:path";
import fs from "node:fs";

const getDbPath = () => {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  if (process.env.DATABASE_URL && (process.env.DATABASE_URL.endsWith(".sqlite") || process.env.DATABASE_URL.endsWith(".db"))) {
    return process.env.DATABASE_URL;
  }

  // Walk up directory tree until we locate root tsconfig.base.json
  let curr = process.cwd();
  while (curr && curr !== path.parse(curr).root) {
    if (fs.existsSync(path.join(curr, "tsconfig.base.json"))) {
      return path.resolve(curr, "proofscale.sqlite");
    }
    curr = path.dirname(curr);
  }

  return path.resolve(process.cwd(), "proofscale.sqlite");
};

const dbPath = getDbPath();
export const sqliteDb: Database.Database = new Database(dbPath);

// Enable WAL mode for high performance concurrent writes
sqliteDb.pragma("journal_mode = WAL");

export const db = drizzle(sqliteDb, { schema });
export type DbClient = typeof db;
export { schema };
