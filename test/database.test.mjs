import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(here, "../db/healthpath.sqlite"));
db.exec("PRAGMA foreign_keys = ON");

test("official public-data tables are seeded", () => {
  for (const table of ["data_sources", "mortality_data", "annual_deaths_by_state", "population_by_state", "screenings_by_state", "reference_values", "prioritisation_rules", "recommendations", "indicator_cause_link"]) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    assert.ok(Number(row.count) > 0, `${table} should contain seed data`);
  }
});

test("foreign keys are valid", () => {
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("reference values retain source and year", () => {
  const row = db.prepare(`
    SELECT h.indicator_name, r.reference_value, r.reference_year, s.dataset_name
    FROM reference_values r
    JOIN health_indicators h ON h.indicator_id = r.indicator_id
    JOIN data_sources s ON s.source_id = r.source_id
    WHERE h.indicator_id = 'indicator_activity'
  `).get();
  assert.equal(row.reference_year, 2023);
  assert.equal(row.dataset_name, "NHMS 2023 Fact Sheet: Non-Communicable Diseases and Healthcare Demand");
});

test.after(() => db.close());
