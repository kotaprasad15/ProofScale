import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

import * as sqliteSchema from "./schema/index.js";
import * as pgSchema from "./schemaPg/index.js";
import { runMigrations } from "./migrate.js";
import { runPgMigrations } from "./migratePg.js";

// Walk up directory tree to load .env reliably
let envLoaded = false;
let checkDir = process.cwd();
while (checkDir && checkDir !== path.parse(checkDir).root) {
  const envPath = path.join(checkDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
  checkDir = path.dirname(checkDir);
}
if (!envLoaded) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

export function normalizeDatabaseUrl(url: string): string {
  let clean = url.replace(/\[|\]/g, "").trim();
  try {
    const u = new URL(clean);
    // Direct Supabase host: db.<project-ref>.supabase.co
    const match = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const projectRef = match[1];
      const region = process.env.SUPABASE_REGION || "ap-southeast-1";
      // Auto-rewrite direct IPv6-only host to IPv4 connection pooler
      u.hostname = `aws-0-${region}.pooler.supabase.com`;
      u.port = "6543";
      if (u.username === "postgres") {
        u.username = `postgres.${projectRef}`;
      }
      return u.toString();
    }
  } catch {}
  return clean;
}

const dbUrl = process.env.DATABASE_URL || "";
export const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

let sqliteDb: Database.Database | null = null;
let pgPool: pg.Pool | null = null;
let dbInstance: any = null;

if (isPostgres) {
  const cleanUrl = normalizeDatabaseUrl(dbUrl);
  pgPool = new pg.Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  });

  // Automatically ensure all tables, RLS, and indexes exist
  runPgMigrations(cleanUrl).catch(err => {
    console.warn("Auto-migration notice (Postgres):", err.message);
  });

  dbInstance = drizzlePg(pgPool, { schema: pgSchema });
} else {
  const getDbPath = () => {
    if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
    if (process.env.DATABASE_URL && (process.env.DATABASE_URL.endsWith(".sqlite") || process.env.DATABASE_URL.endsWith(".db"))) {
      return process.env.DATABASE_URL;
    }

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
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  try {
    runMigrations(sqliteDb);
  } catch (err: any) {
    console.warn("Auto-migration notice (SQLite):", err.message);
  }

  dbInstance = drizzleSqlite(sqliteDb, { schema: sqliteSchema });
}

export { sqliteDb, pgPool };
export const db: ReturnType<typeof drizzleSqlite<typeof sqliteSchema>> = dbInstance;
export type DbClient = typeof db;
export const schema = isPostgres ? pgSchema : sqliteSchema;
