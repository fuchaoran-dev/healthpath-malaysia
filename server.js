import express from "express";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./db/seed.mjs";
import { profileFactorValue, ruleMatches } from "./src/rules.mjs";
import { EXPLAIN_DISCLAIMERS, EXPLANATION_KINDS, TARGET_TYPES, assembleExplanation, buildContextPack, checkOutOfScope, verifyGrounded } from "./src/explain-safety.mjs";
import { allowGeneration, cacheExplanation, cachedExplanation, explainWithGemini } from "./src/explain-gemini.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, "db/healthpath.sqlite");
const distPath = path.join(here, "dist");

if (!existsSync(dbPath)) seedDatabase();

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

const AGE_GROUPS = ["40-44", "45-49", "50-54", "55-60"];
const GENDERS = ["male", "female", "prefer_not_to_say"];
const PHYSICAL_ACTIVITY = ["low", "moderate", "high"];
const SCREENING = ["yes", "no", "unsure"];
const FAMILY_HISTORY = ["heart_disease", "diabetes", "cancer", "stroke", "none", "unsure"];
const STATES = db.prepare("SELECT DISTINCT state FROM population_by_state ORDER BY state").all().map((row) => row.state);

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

function referenceFor(indicatorId) {
  return db.prepare(`
    SELECT r.*, h.indicator_name, s.dataset_name, s.organisation, s.source_url
    FROM reference_values r
    JOIN health_indicators h ON h.indicator_id = r.indicator_id
    JOIN data_sources s ON s.source_id = r.source_id
    WHERE r.indicator_id = ?
    ORDER BY r.reference_year DESC
    LIMIT 1
  `).get(indicatorId);
}

function mortalityFor(indicatorId, profile) {
  const band = ageBandFor(profile);
  const rows = db.prepare(`
    SELECT DISTINCT m.*, c.cause_name, c.category, s.dataset_name, s.source_url
    FROM indicator_cause_link l
    JOIN mortality_data m ON m.cause_id = l.cause_id
    JOIN causes_of_death c ON c.cause_id = m.cause_id
    JOIN data_sources s ON s.source_id = m.source_id
    WHERE l.indicator_id = ?
      AND m.year = 2024
      AND m.state = 'Malaysia'
      AND (m.age_group = 'all' OR m.age_group = ?)
    ORDER BY CASE WHEN m.age_group = ? THEN 0 ELSE 1 END, m.measure_value DESC
  `).all(indicatorId, band || "__none__", band || "__none__");
  return rows;
}

function recommendationsFor(ruleIds) {
  if (!ruleIds.length) return [];
  const placeholders = ruleIds.map(() => "?").join(",");
  return db.prepare(`
    SELECT DISTINCT p.*
    FROM rule_recommendation rr
    JOIN recommendations p ON p.recommendation_id = rr.recommendation_id
    WHERE rr.rule_id IN (${placeholders})
  `).all(...ruleIds);
}

function buildAssessment(profile) {
  const rules = db.prepare(`
    SELECT r.*, h.indicator_name, h.description AS indicator_description
    FROM prioritisation_rules r
    JOIN health_indicators h ON h.indicator_id = r.indicator_id
    WHERE r.active = 1
  `).all();
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

  const prioritised_indicators = [...byIndicator.values()]
    .sort((a, b) => b.priority_score - a.priority_score || a.indicator_name.localeCompare(b.indicator_name))
    .map((item, index) => {
      const reference = referenceFor(item.indicator_id);
      const mortality_context = mortalityFor(item.indicator_id, profile);
      return {
        ...item,
        priority_position: index + 1,
        explanation: item.explanations.join(" "),
        reference,
        mortality_context,
      };
    });

  const ruleIds = prioritised_indicators.flatMap((item) => item.rule_ids);
  const recommendations = recommendationsFor(ruleIds);
  const orderedRecommendations = prioritised_indicators.flatMap((indicator) =>
    recommendations
      .filter((item) => item.indicator_id === indicator.indicator_id)
      .map((item) => ({ ...item, indicator_name: indicator.indicator_name, priority_position: indicator.priority_position })),
  );

  return {
    profile,
    prioritised_indicators,
    recommendations: orderedRecommendations,
    sources: db.prepare("SELECT * FROM data_sources ORDER BY organisation, dataset_name").all(),
    disclaimer: "This information is educational and based on population-level Malaysian data. It does not predict individual outcomes and does not replace professional medical advice.",
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, database: "SQLite" }));

app.get("/api/sources", (_req, res) => {
  res.json({ sources: db.prepare("SELECT * FROM data_sources ORDER BY organisation, dataset_name").all() });
});

app.get("/api/overview", (req, res) => {
  const state = STATES.includes(req.query.state) ? req.query.state : "Johor";
  const mortality = db.prepare(`
    SELECT m.*, c.cause_name, c.category, s.dataset_name, s.source_url
    FROM mortality_data m
    JOIN causes_of_death c ON c.cause_id = m.cause_id
    JOIN data_sources s ON s.source_id = m.source_id
    WHERE m.year = 2024 AND m.age_group = 'all'
    ORDER BY m.measure_value DESC
  `).all();
  const annualDeaths = db.prepare(`
    SELECT year, SUM(death_count) AS death_count
    FROM annual_deaths_by_state
    WHERE state = ? AND sex = 'both' AND ethnicity = 'overall'
    GROUP BY year ORDER BY year DESC LIMIT 8
  `).all(state).reverse();
  const population = db.prepare(`
    SELECT year, population_thousands
    FROM population_by_state
    WHERE state = ? AND sex = 'both' AND age_group = 'overall' AND ethnicity = 'overall'
    ORDER BY year DESC LIMIT 1
  `).get(state);
  const screenings = db.prepare(`
    SELECT date, screening_count
    FROM screenings_by_state WHERE state = ?
    ORDER BY date DESC LIMIT 14
  `).all(state).reverse();
  res.json({ state, mortality, annualDeaths, population, screenings, sources: db.prepare("SELECT * FROM data_sources ORDER BY organisation, dataset_name").all() });
});

app.post("/api/assess", (req, res) => {
  const errors = validationErrors(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: "Please correct the highlighted fields.", fieldErrors: errors });
  res.json(buildAssessment({
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
  }));
});

app.post("/api/explain", async (req, res) => {
  try {
    const { target_type: targetType, target_id: targetId, kind, age_group: ageGroup, session_id: sessionId } = req.body || {};
    if (!TARGET_TYPES.includes(targetType) || !EXPLANATION_KINDS.includes(kind) || typeof targetId !== "string") return res.status(400).json({ error: "Choose a displayed item and explanation type." });
    if (!AGE_GROUPS.includes(ageGroup)) return res.status(400).json({ error: "The displayed age group is required." });

    const profile = { age_group: ageGroup };
    let recommendation = targetType === "recommendation" ? db.prepare("SELECT * FROM recommendations WHERE recommendation_id = ?").get(targetId) : null;
    if (targetType === "recommendation" && !recommendation) return res.status(404).json({ error: "This item is not available in the database." });
    const indicatorId = recommendation ? recommendation.indicator_id : targetId;
    const indicator = db.prepare("SELECT * FROM health_indicators WHERE indicator_id = ?").get(indicatorId);
    const reference = referenceFor(indicatorId);
    if (!indicator || !reference) return res.status(404).json({ error: "This item is not available in the database." });
    if (!recommendation) recommendation = db.prepare("SELECT * FROM recommendations WHERE indicator_id = ? ORDER BY recommendation_id LIMIT 1").get(indicatorId) || null;
    const mortality = mortalityFor(indicatorId, profile);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The server could not complete that request." });
  }
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) return res.sendFile(path.join(distPath, "index.html"));
    return next();
  });
}

app.listen(port, () => {
  console.log(`HealthPath Malaysia running at http://localhost:${port}`);
});
