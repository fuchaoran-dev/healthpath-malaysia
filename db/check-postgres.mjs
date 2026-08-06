import { randomUUID } from "node:crypto";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const options = { connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15000 };
if (process.env.DATABASE_SSL !== "false") options.ssl = { rejectUnauthorized: false };
const pool = new Pool(options);
const client = await pool.connect();
const sessionId = `check-${randomUUID()}`;

try {
  const tables = ["data_sources", "mortality_data", "annual_deaths_by_state", "population_by_state", "screenings_by_state", "reference_values", "prioritisation_rules", "recommendations", "user_sessions", "user_profiles", "assessment_results", "user_goals"];
  const counts = {};
  for (const table of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
    counts[table] = rows[0].count;
  }

  await client.query("BEGIN");
  await client.query("INSERT INTO user_sessions (session_id, consent_accepted) VALUES ($1, TRUE)", [sessionId]);
  await client.query("INSERT INTO user_profiles (session_id, profile_json) VALUES ($1, $2::jsonb)", [sessionId, JSON.stringify({ check: true })]);
  await client.query("INSERT INTO assessment_results (session_id, result_json) VALUES ($1, $2::jsonb)", [sessionId, JSON.stringify({ check: true })]);
  const { rows: readBack } = await client.query("SELECT profile_json->>'check' AS profile_check, result_json->>'check' AS result_check FROM user_profiles JOIN assessment_results USING (session_id) WHERE session_id = $1", [sessionId]);
  if (readBack[0]?.profile_check !== "true" || readBack[0]?.result_check !== "true") throw new Error("PostgreSQL write/read check failed.");
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ database: "PostgreSQL", counts, write_read_check: "passed" }, null, 2));
} finally {
  client.release();
  await pool.end();
}
