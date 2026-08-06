import { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

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
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function yearFromDate(value) {
  return Number(String(value).slice(0, 4));
}

async function insertBatches(client, { table, columns, rows, mapRow, label }) {
  const batchSize = 500;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const params = [];
    const values = batch.map((row, rowIndex) => {
      const mapped = mapRow(row);
      const offset = rowIndex * columns.length;
      params.push(...mapped);
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(", ")})`;
    }).join(", ");
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values} ON CONFLICT DO NOTHING`,
      params,
    );
    const completed = Math.min(start + batch.length, rows.length);
    if (completed === rows.length || (start / batchSize) % 10 === 0) console.log(`${label}: ${completed}/${rows.length}`);
  }
}

function poolOptions() {
  const options = { connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 15000 };
  if (process.env.DATABASE_SSL !== "false") options.ssl = { rejectUnauthorized: false };
  return options;
}

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Add your cloud PostgreSQL connection string first.");

  const pool = new Pool(poolOptions());
  const client = await pool.connect();
  try {
    await client.query(readFileSync(path.join(here, "schema.postgres.sql"), "utf8"));

    const seedSql = readFileSync(path.join(here, "seed.sql"), "utf8")
      .split(/;\s*(?=INSERT OR IGNORE INTO|$)/)
      .map((statement) => statement.replace("INSERT OR IGNORE INTO", "INSERT INTO").trim())
      .filter(Boolean);

    await client.query("BEGIN");
    for (const statement of seedSql) await client.query(`${statement} ON CONFLICT DO NOTHING`);

    const annualRows = parseCsv(readFileSync(path.join(here, "source-data/deaths_sex_ethnic_state.csv"), "utf8"));
    const populationRows = parseCsv(readFileSync(path.join(here, "source-data/population_state.csv"), "utf8"));
    const screeningRows = parseCsv(readFileSync(path.join(here, "source-data/pekab40_screenings_state.csv"), "utf8"));

    await insertBatches(client, {
      table: "annual_deaths_by_state",
      columns: ["death_id", "source_id", "year", "state", "sex", "ethnicity", "death_count"],
      rows: annualRows,
      label: "annual deaths",
      mapRow: (row) => [`death_${row.date}_${slug(row.state)}_${row.sex}_${row.ethnicity}`, "src_dosm_deaths_state", yearFromDate(row.date), row.state, row.sex, row.ethnicity, Math.round(Number(row.abs))],
    });
    await insertBatches(client, {
      table: "population_by_state",
      columns: ["population_id", "source_id", "year", "state", "sex", "age_group", "ethnicity", "population_thousands"],
      rows: populationRows,
      label: "population",
      mapRow: (row) => [`population_${row.date}_${slug(row.state)}_${row.sex}_${row.age}_${row.ethnicity}`, "src_dosm_population_state", yearFromDate(row.date), row.state, row.sex, row.age, row.ethnicity, Number(row.population)],
    });
    await insertBatches(client, {
      table: "screenings_by_state",
      columns: ["screening_id", "source_id", "date", "state", "screening_count"],
      rows: screeningRows,
      label: "screenings",
      mapRow: (row) => [`screening_${row.date}_${slug(row.state)}`, "src_peka_b40", row.date, row.state, Math.round(Number(row.screenings))],
    });

    await client.query("COMMIT");
    const counts = {};
    for (const table of ["data_sources", "mortality_data", "annual_deaths_by_state", "population_by_state", "screenings_by_state", "reference_values", "prioritisation_rules", "recommendations", "user_sessions", "user_profiles", "assessment_results", "user_goals"]) {
      const { rows } = await client.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
      counts[table] = rows[0].count;
    }
    console.log(JSON.stringify({ database: "PostgreSQL", ...counts, imported: { annualRows: annualRows.length, populationRows: populationRows.length, screeningRows: screeningRows.length } }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
