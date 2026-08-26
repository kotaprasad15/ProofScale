import { defineConfig } from "drizzle-kit";
import path from "node:path";

const schemaPath = path.resolve(__dirname, "./dist/schema/index.js").replace(/\\/g, "/");
const dbPath = (process.env.DATABASE_URL || path.resolve(__dirname, "../../proofscale.sqlite")).replace(/\\/g, "/");

export default defineConfig({
  dialect: "sqlite",
  schema: schemaPath,
  out: "./drizzle",
  dbCredentials: {
    url: dbPath
  }
});
