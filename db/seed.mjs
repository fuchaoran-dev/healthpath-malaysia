import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const dbPath = path.join(here, "healthpath.sqlite");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])),
  );
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function yearFromDate(value) {
  return Number(String(value).slice(0, 4));
}

export function seedDatabase({ reset = false } = {}) {
  if (reset && existsSync(dbPath)) unlinkSync(dbPath);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(path.join(here, "schema.sql"), "utf8"));
  db.exec(readFileSync(path.join(here, "seed.sql"), "utf8"));

  const annualRows = parseCsv(
    readFileSync(path.join(here, "source-data/deaths_sex_ethnic_state.csv"), "utf8"),
  );
  const populationRows = parseCsv(
    readFileSync(path.join(here, "source-data/population_state.csv"), "utf8"),
  );
  const screeningRows = parseCsv(
    readFileSync(path.join(here, "source-data/pekab40_screenings_state.csv"), "utf8"),
  );

  const insertAnnual = db.prepare(`
    INSERT OR IGNORE INTO annual_deaths_by_state
      (death_id, source_id, year, state, sex, ethnicity, death_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPopulation = db.prepare(`
    INSERT OR IGNORE INTO population_by_state
      (population_id, source_id, year, state, sex, age_group, ethnicity, population_thousands)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertScreening = db.prepare(`
    INSERT OR IGNORE INTO screenings_by_state
      (screening_id, source_id, date, state, screening_count)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const row of annualRows) {
      insertAnnual.run(
        `death_${row.date}_${slug(row.state)}_${row.sex}_${row.ethnicity}`,
        "src_dosm_deaths_state",
        yearFromDate(row.date),
        row.state,
        row.sex,
        row.ethnicity,
        Math.round(Number(row.abs)),
      );
    }

    for (const row of populationRows) {
      insertPopulation.run(
        `population_${row.date}_${slug(row.state)}_${row.sex}_${row.age}_${row.ethnicity}`,
        "src_dosm_population_state",
        yearFromDate(row.date),
        row.state,
        row.sex,
        row.age,
        row.ethnicity,
        Number(row.population),
      );
    }

    for (const row of screeningRows) {
      insertScreening.run(
        `screening_${row.date}_${slug(row.state)}`,
        "src_peka_b40",
        row.date,
        row.state,
        Math.round(Number(row.screenings)),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  db.close();
  return { annualRows: annualRows.length, populationRows: populationRows.length, screeningRows: screeningRows.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const counts = seedDatabase({ reset: true });
  console.log(JSON.stringify({ database: dbPath, ...counts }, null, 2));
}
