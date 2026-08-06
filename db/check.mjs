import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, "healthpath.sqlite");

if (!existsSync(dbPath)) {
  console.error("Database not found. Run npm run seed first.");
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
const tables = [
  "data_sources",
  "causes_of_death",
  "health_indicators",
  "mortality_data",
  "annual_deaths_by_state",
  "population_by_state",
  "screenings_by_state",
  "reference_values",
  "prioritisation_rules",
  "recommendations",
  "indicator_cause_link",
];
const counts = Object.fromEntries(
  tables.map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]),
);
console.log(JSON.stringify({ counts, foreign_key_errors: db.prepare("PRAGMA foreign_key_check").all() }, null, 2));
db.close();
