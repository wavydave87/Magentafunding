/**
 * Applies every migration in supabase/migrations, in filename order, to a
 * fresh in-memory Postgres (PGlite) after loading the minimal Supabase
 * environment from supabase-stubs.sql. Exits non-zero on the first failure
 * so a migration that only worked against the old shared database is caught.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");
const stubs = readFileSync(join(import.meta.dir, "supabase-stubs.sql"), "utf8");

const REQUIRED_TABLES = [
  "deals",
  "rep_profiles",
  "user_roles",
  "partner_organizations",
  "partner_members",
  "partner_applications",
  "partner_commissions",
];

const REQUIRED_BUCKETS = ["closing-documents", "partner-documents", "partner-resources"];

const db = new PGlite({ extensions: { pgcrypto } });

try {
  await db.exec(stubs);
} catch (error) {
  console.error(`FAIL supabase-stubs.sql: ${(error as Error).message}`);
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const file of files) {
  try {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    console.log(`ok ${file}`);
  } catch (error) {
    console.error(`FAIL ${file}: ${(error as Error).message}`);
    process.exit(1);
  }
}

const { rows } = await db.query<{ table_name: string }>(
  "select table_name from information_schema.tables where table_schema = 'public'",
);
const present = new Set(rows.map((row) => row.table_name));
const missing = REQUIRED_TABLES.filter((table) => !present.has(table));
if (missing.length > 0) {
  console.error(`FAIL missing tables: ${missing.join(", ")}`);
  process.exit(1);
}

const { rows: buckets } = await db.query<{ id: string }>("select id from storage.buckets");
const bucketIds = new Set(buckets.map((row) => row.id));
const missingBuckets = REQUIRED_BUCKETS.filter((id) => !bucketIds.has(id));
if (missingBuckets.length > 0) {
  console.error(`FAIL missing storage buckets: ${missingBuckets.join(", ")}`);
  process.exit(1);
}

console.log(`tables ok (${files.length} migrations applied)`);
