import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testConn() {
  const rawUrl = process.env.DATABASE_URL || "";
  console.log("Raw DATABASE_URL from .env:", rawUrl);

  const cleanUrl = rawUrl.replace(/\[|\]/g, "").trim();
  console.log("Testing with cleaned URL (brackets removed):", cleanUrl.replace(/:[^:]*@/, ":****@"));

  const client = new pg.Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL!");
    const res = await client.query("SELECT NOW() as now, version() as version;");
    console.log("Query result:", res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error("❌ Connection failed with cleaned URL:", err.message);

    // Try literal raw URL
    console.log("Testing with literal raw URL...");
    const client2 = new pg.Client({
      connectionString: rawUrl.trim(),
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client2.connect();
      console.log("✅ Connected with literal brackets in password!");
      await client2.end();
    } catch (err2: any) {
      console.error("❌ Connection failed with literal raw URL:", err2.message);
    }
  }
}

testConn();
