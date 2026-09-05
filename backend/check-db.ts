import "dotenv/config";
import { Pool } from "pg";

const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
console.log("Connecting to:", url?.substring(0, 40) + "...");

const pool = new Pool({ connectionString: url });

try {
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log("Tables found:", tables.rows.length);
  tables.rows.forEach((r) => console.log(" -", r.tablename));

  const migrations = await pool.query("SELECT name FROM _migrations ORDER BY id").catch(() => null);
  if (migrations) {
    console.log("Migrations applied:", migrations.rows.map((r) => r.name).join(", "));
  } else {
    console.log("No _migrations table found");
  }
} catch (e) {
  console.error("Error:", (e as Error).message);
} finally {
  await pool.end();
}
