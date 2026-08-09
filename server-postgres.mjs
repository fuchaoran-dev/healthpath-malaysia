import express from "express";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { profileFactorValue, ruleMatches } from "./src/rules.mjs";
import { EXPLAIN_DISCLAIMERS, EXPLANATION_KINDS, TARGET_TYPES, assembleExplanation, buildContextPack, checkOutOfScope, verifyGrounded } from "./src/explain-safety.mjs";
import { allowGeneration, cacheExplanation, cachedExplanation, explainWithGemini } from "./src/explain-gemini.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when using the PostgreSQL server.");

const here = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(here, "dist");
const port = Number(process.env.PORT || 3000);
const poolOptions = { connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 15000 };
if (process.env.DATABASE_SSL !== "false") poolOptions.ssl = { rejectUnauthorized: false };
const pool = new Pool(poolOptions);

function validSessionId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(value);
}

async function query(text, params = []) {
  return pool.query(text, params);
}

const AGE_GROUPS = ["40-44", "45-49", "50-54", "55-60"];
const GENDERS = ["male", "female", "prefer_not_to_say"];
const PHYSICAL_ACTIVITY = ["low", "moderate", "high"];
const SCREENING = ["yes", "no", "unsure"];
const FAMILY_HISTORY = ["heart_disease", "diabetes", "cancer", "stroke", "none", "unsure"];
let STATES = [];

function validationErrors(body) {
  const errors = {};
  if (!body || typeof body !== "object") return { form: "Profile data is required." };
  if (!AGE_GROUPS.includes(body.age_group)) errors.age_group = "Select an age group from 40-44, 45-49, 50-54 or 55-60.";
  if (!GENDERS.includes(body.gender)) errors.gender = "Select male, female or prefer not to say.";
  if (!STATES.includes(body.state)) errors.state = "Select a Malaysian state.";

  const lifestyle = body.lifestyle;
  if (!lifestyle || typeof lifestyle !== "object") {
    errors.lifestyle = "Lifestyle answers are required.";
  } else {
    if (!PHYSICAL_ACTIVITY.includes(lifestyle.physical_activity)) errors.physical_activity = "Select an activity level.";
    if (!Number.isFinite(Number(lifestyle.sleep_hours)) || Number(lifestyle.sleep_hours) < 0 || Number(lifestyle.sleep_hours) > 24) errors.sleep_hours = "Sleep duration must be between 0 and 24 hours.";
    if (typeof lifestyle.smoker !== "boolean") errors.smoker = "Select whether you currently smoke.";
    if (typeof lifestyle.diet_high_sugar !== "boolean") errors.diet_high_sugar = "Select a diet response.";
    if (!SCREENING.includes(lifestyle.recent_screening)) errors.recent_screening = "Select a recent-screening response.";
  }

  if (!Array.isArray(body.family_history) || body.family_history.length < 1) {
    errors.family_history = "Select at least one family-history option.";
  } else if (body.family_history.some((item) => !FAMILY_HISTORY.includes(item))) {
    errors.family_history = "Use the available broad family-history categories only.";
  } else if (body.family_history.includes("none") && body.family_history.length > 1) {
    errors.family_history = "Choose None by itself, or choose one or more conditions.";
  }
  return errors;
}

function ageBandFor(profile) {
  return ["45-49", "50-54"].includes(profile.age_group) ? "41-59" : null;
}

async function referenceFor(indicatorId) {
  const { rows } = await query(`
    SELECT r.*, h.indicator_name, s.dataset_name, s.organisation, s.source_url
    FROM reference_values r
    JOIN health_indicators h ON h.indicator_id = r.indicator_id
    JOIN data_sources s ON s.source_id = r.source_id
    WHERE r.indicator_id = $1
    ORDER BY r.reference_year DESC
    LIMIT 1
  `, [indicatorId]);
  return rows[0] || null;
}

async function mortalityFor(indicatorId, profile) {
  const band = ageBandFor(profile);
  const { rows } = await query(`
    SELECT m.*, c.cause_name, c.category, s.dataset_name, s.source_url
    FROM indicator_cause_link l
    JOIN mortality_data m ON m.cause_id = l.cause_id
    JOIN causes_of_death c ON c.cause_id = m.cause_id
    JOIN data_sources s ON s.source_id = m.source_id
    WHERE l.indicator_id = $1
      AND m.year = 2024
      AND m.state = 'Malaysia'
      AND (m.age_group = 'all' OR m.age_group = $2)
    ORDER BY CASE WHEN m.age_group = $3 THEN 0 ELSE 1 END, m.measure_value DESC
  `, [indicatorId, band || "__none__", band || "__none__"]);
  return rows;
}

async function recommendationsFor(ruleIds) {
  if (!ruleIds.length) return [];
  const placeholders = ruleIds.map((_, index) => `$${index + 1}`).join(",");
  const { rows } = await query(`
    SELECT DISTINCT p.*
    FROM rule_recommendation rr
    JOIN recommendations p ON p.recommendation_id = rr.recommendation_id
    WHERE rr.rule_id IN (${placeholders})
  `, ruleIds);
  return rows;
}

async function buildAssessment(profile) {
  const { rows: rules } = await query(`
    SELECT r.*, h.indicator_name, h.description AS indicator_description
    FROM prioritisation_rules r
    JOIN health_indicators h ON h.indicator_id = r.indicator_id
    WHERE r.active = 1
  `);
  const matched = rules.filter((rule) => ruleMatches(profile, rule));
  const byIndicator = new Map();

  for (const rule of matched) {
    const existing = byIndicator.get(rule.indicator_id) || {
      indicator_id: rule.indicator_id,
      indicator_name: rule.indicator_name,
      description: rule.indicator_description,
      priority_score: 0,
      contributing_factors: [],
      explanations: [],
      rule_ids: [],
    };
    existing.priority_score = Math.max(existing.priority_score, rule.priority_score);
    existing.contributing_factors.push({ factor: rule.profile_factor, value: profileFactorValue(profile, rule.profile_factor) });
    existing.explanations.push(rule.explanation);
    existing.rule_ids.push(rule.rule_id);
    byIndicator.set(rule.indicator_id, existing);
  }

  const prioritised_indicators = [];
  for (const [index, item] of [...byIndicator.values()].sort((a, b) => b.priority_score - a.priority_score || a.indicator_name.localeCompare(b.indicator_name)).entries()) {
    prioritised_indicators.push({
      ...item,
      priority_position: index + 1,
      explanation: item.explanations.join(" "),
      reference: await referenceFor(item.indicator_id),
      mortality_context: await mortalityFor(item.indicator_id, profile),
    });
  }

  const ruleIds = prioritised_indicators.flatMap((item) => item.rule_ids);
  const recommendations = await recommendationsFor(ruleIds);
  const orderedRecommendations = prioritised_indicators.flatMap((indicator) => recommendations
    .filter((item) => item.indicator_id === indicator.indicator_id)
    .map((item) => ({ ...item, indicator_name: indicator.indicator_name, priority_position: indicator.priority_position })));

  const { rows: sources } = await query("SELECT * FROM data_sources ORDER BY organisation, dataset_name");
  return {
    profile,
    prioritised_indicators,
    recommendations: orderedRecommendations,
    sources,
    disclaimer: "This information is educational and based on population-level Malaysian data. It does not predict individual outcomes and does not replace professional medical advice.",
  };
}

async function touchSession(sessionId) {
  await query(`
    INSERT INTO user_sessions (session_id) VALUES ($1)
    ON CONFLICT (session_id) DO UPDATE SET last_seen_at = NOW()
  `, [sessionId]);
}

async function hasConsent(sessionId) {
  const { rows } = await query("SELECT consent_accepted FROM user_sessions WHERE session_id = $1", [sessionId]);
  return rows[0]?.consent_accepted === true;
}

async function goalsFor(sessionId) {
  const { rows } = await query(`
    SELECT g.goal_id, g.session_id, g.recommendation_id, g.progress, g.complete, g.start_date,
           r.action_title AS title, r.action_description, r.indicator_id
    FROM user_goals g
    JOIN recommendations r ON r.recommendation_id = g.recommendation_id
    WHERE g.session_id = $1
    ORDER BY g.goal_id
  `, [sessionId]);
  return rows;
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, database: "PostgreSQL", write_api: true }));

app.get("/api/sources", async (_req, res, next) => {
  try { const { rows } = await query("SELECT * FROM data_sources ORDER BY organisation, dataset_name"); res.json({ sources: rows }); } catch (error) { next(error); }
});

app.get("/api/overview", async (req, res, next) => {
  try {
    const state = STATES.includes(req.query.state) ? req.query.state : "Johor";
    const [{ rows: mortality }, { rows: annualDeaths }, populationResult, { rows: screenings }, { rows: sources }] = await Promise.all([
      query(`SELECT m.*, c.cause_name, c.category, s.dataset_name, s.source_url
        FROM mortality_data m JOIN causes_of_death c ON c.cause_id = m.cause_id JOIN data_sources s ON s.source_id = m.source_id
        WHERE m.year = 2024 AND m.age_group = 'all' ORDER BY m.measure_value DESC`),
      query(`SELECT year, SUM(death_count)::integer AS death_count FROM annual_deaths_by_state
        WHERE state = $1 AND sex = 'both' AND ethnicity = 'overall' GROUP BY year ORDER BY year DESC LIMIT 8`, [state]),
      query(`SELECT year, population_thousands FROM population_by_state
        WHERE state = $1 AND sex = 'both' AND age_group = 'overall' AND ethnicity = 'overall'
        ORDER BY year DESC LIMIT 1`, [state]),
      query(`SELECT date, screening_count FROM screenings_by_state WHERE state = $1 ORDER BY date DESC LIMIT 14`, [state]),
      query("SELECT * FROM data_sources ORDER BY organisation, dataset_name"),
    ]);
    res.json({ state, mortality, annualDeaths: annualDeaths.reverse(), population: populationResult.rows[0] || null, screenings: screenings.reverse(), sources });
  } catch (error) { next(error); }
});

app.post("/api/session/consent", async (req, res, next) => {
  try {
    const { session_id: sessionId, accepted } = req.body || {};
    if (!validSessionId(sessionId) || typeof accepted !== "boolean") return res.status(400).json({ error: "A valid session_id and accepted value are required." });
    await touchSession(sessionId);
    await query("UPDATE user_sessions SET consent_accepted = $2, last_seen_at = NOW() WHERE session_id = $1", [sessionId, accepted]);
    if (!accepted) await query("DELETE FROM user_profiles WHERE session_id = $1", [sessionId]);
    res.json({ ok: true, session_id: sessionId, consent_accepted: accepted });
  } catch (error) { next(error); }
});

app.get("/api/session/:sessionId", async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: "Invalid session_id." });
    const [{ rows: sessions }, { rows: profiles }, { rows: results }] = await Promise.all([
      query("SELECT session_id, consent_accepted FROM user_sessions WHERE session_id = $1", [sessionId]),
      query("SELECT profile_json FROM user_profiles WHERE session_id = $1", [sessionId]),
      query("SELECT result_json FROM assessment_results WHERE session_id = $1", [sessionId]),
    ]);
    res.json({ session_id: sessionId, consent_accepted: sessions[0]?.consent_accepted === true, profile: profiles[0]?.profile_json || null, result: results[0]?.result_json || null, goals: await goalsFor(sessionId) });
  } catch (error) { next(error); }
});

app.delete("/api/session/:sessionId", async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: "Invalid session_id." });
    await query("DELETE FROM user_sessions WHERE session_id = $1", [sessionId]);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post("/api/assess", async (req, res, next) => {
  try {
    const errors = validationErrors(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: "Please correct the highlighted fields.", fieldErrors: errors });
    const profile = {
      age_group: req.body.age_group,
      gender: req.body.gender,
      state: req.body.state,
      lifestyle: {
        physical_activity: req.body.lifestyle.physical_activity,
        sleep_hours: Number(req.body.lifestyle.sleep_hours),
        smoker: req.body.lifestyle.smoker,
        diet_high_sugar: req.body.lifestyle.diet_high_sugar,
        recent_screening: req.body.lifestyle.recent_screening,
      },
      family_history: req.body.family_history,
    };
    const result = await buildAssessment(profile);
    const sessionId = req.body.session_id;
    if (validSessionId(sessionId) && await hasConsent(sessionId)) {
      await query(`INSERT INTO user_profiles (session_id, profile_json, updated_at) VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (session_id) DO UPDATE SET profile_json = EXCLUDED.profile_json, updated_at = NOW()`, [sessionId, JSON.stringify(profile)]);
      await query(`INSERT INTO assessment_results (session_id, result_json, updated_at) VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (session_id) DO UPDATE SET result_json = EXCLUDED.result_json, updated_at = NOW()`, [sessionId, JSON.stringify(result)]);
      await query("UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = $1", [sessionId]);
    }
    res.json(result);
  } catch (error) { next(error); }
});

app.post("/api/explain", async (req, res, next) => {
  try {
    const { target_type: targetType, target_id: targetId, kind, age_group: ageGroup, session_id: sessionId } = req.body || {};
    if (!TARGET_TYPES.includes(targetType) || !EXPLANATION_KINDS.includes(kind) || typeof targetId !== "string") return res.status(400).json({ error: "Choose a displayed item and explanation type." });
    if (!AGE_GROUPS.includes(ageGroup)) return res.status(400).json({ error: "The displayed age group is required." });

    const profile = { age_group: ageGroup };
    let recommendation = null;
    if (targetType === "recommendation") {
      const { rows } = await query("SELECT * FROM recommendations WHERE recommendation_id = $1", [targetId]);
      recommendation = rows[0] || null;
      if (!recommendation) return res.status(404).json({ error: "This item is not available in the database." });
    }
    const indicatorId = recommendation ? recommendation.indicator_id : targetId;
    const [{ rows: indicators }, reference, mortality] = await Promise.all([
      query("SELECT * FROM health_indicators WHERE indicator_id = $1", [indicatorId]),
      referenceFor(indicatorId),
      mortalityFor(indicatorId, profile),
    ]);
    const indicator = indicators[0];
    if (!indicator || !reference) return res.status(404).json({ error: "This item is not available in the database." });
    if (!recommendation) {
      const { rows } = await query("SELECT * FROM recommendations WHERE indicator_id = $1 ORDER BY recommendation_id LIMIT 1", [indicatorId]);
      recommendation = rows[0] || null;
    }
    if (targetType === "mortality" && !mortality.length) return res.status(404).json({ error: "This item is not available in the database." });

    const pack = buildContextPack({ target_type: targetType, kind, indicator, reference, mortality, recommendation });
    const source = targetType === "mortality" ? mortality[0].dataset_name : reference.dataset_name;
    const cacheKey = `${targetType}:${targetId}:${kind}:${ageBandFor(profile) || "all"}`;
    const cached = cachedExplanation(cacheKey);
    if (cached) return res.json({ reply: cached, source, mode: "generated", disclaimer: EXPLAIN_DISCLAIMERS.generated });

    let reply = assembleExplanation(pack);
    let mode = "assembled";
    if (allowGeneration(typeof sessionId === "string" ? sessionId.slice(0, 128) : "anonymous")) {
      const generated = await explainWithGemini(pack);
      if (generated && verifyGrounded(generated, pack) && !checkOutOfScope(generated)) {
        cacheExplanation(cacheKey, generated);
        reply = generated;
        mode = "generated";
      }
    }
    res.json({ reply, source, mode, disclaimer: EXPLAIN_DISCLAIMERS[mode] });
  } catch (error) { next(error); }
});

app.get("/api/goals", async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: "Invalid session_id." });
    res.json({ goals: await goalsFor(sessionId) });
  } catch (error) { next(error); }
});

app.post("/api/goals", async (req, res, next) => {
  try {
    const { session_id: sessionId, recommendation_id: recommendationId } = req.body || {};
    if (!validSessionId(sessionId) || typeof recommendationId !== "string") return res.status(400).json({ error: "A valid session_id and recommendation_id are required." });
    if (!await hasConsent(sessionId)) return res.status(403).json({ error: "Consent is required before saving goals." });
    const { rows: recommendations } = await query("SELECT recommendation_id FROM recommendations WHERE recommendation_id = $1", [recommendationId]);
    if (!recommendations[0]) return res.status(404).json({ error: "Recommendation not found." });
    await query(`INSERT INTO user_goals (session_id, recommendation_id, start_date)
      VALUES ($1, $2, CURRENT_DATE::text) ON CONFLICT (session_id, recommendation_id) DO NOTHING`, [sessionId, recommendationId]);
    res.status(201).json({ goal: (await goalsFor(sessionId)).find((item) => item.recommendation_id === recommendationId) });
  } catch (error) { next(error); }
});

app.patch("/api/goals/:recommendationId", async (req, res, next) => {
  try {
    const sessionId = req.body?.session_id;
    const recommendationId = req.params.recommendationId;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: "Invalid session_id." });
    const progress = req.body?.progress === undefined ? null : Number(req.body.progress);
    const complete = req.body?.complete === undefined ? null : req.body.complete;
    if (progress !== null && (!Number.isFinite(progress) || progress < 0 || progress > 100)) return res.status(400).json({ error: "Progress must be between 0 and 100." });
    if (complete !== null && typeof complete !== "boolean") return res.status(400).json({ error: "Complete must be boolean." });
    await query(`UPDATE user_goals SET progress = COALESCE($1, progress), complete = COALESCE($2, complete), updated_at = NOW()
      WHERE session_id = $3 AND recommendation_id = $4`, [progress, complete, sessionId, recommendationId]);
    res.json({ goal: (await goalsFor(sessionId)).find((item) => item.recommendation_id === recommendationId) || null });
  } catch (error) { next(error); }
});

app.delete("/api/goals/:recommendationId", async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: "Invalid session_id." });
    await query("DELETE FROM user_goals WHERE session_id = $1 AND recommendation_id = $2", [sessionId, req.params.recommendationId]);
    res.status(204).end();
  } catch (error) { next(error); }
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) return res.sendFile(path.join(distPath, "index.html"));
    return next();
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "The server could not complete that request." });
});

await query(readFileSync(path.join(here, "db/schema.postgres.sql"), "utf8"));
const { rows: stateRows } = await query("SELECT DISTINCT state FROM population_by_state ORDER BY state");
STATES = stateRows.map((row) => row.state);
app.listen(port, () => console.log(`HealthPath Malaysia PostgreSQL server running at http://localhost:${port}`));
