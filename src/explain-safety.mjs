export const TARGET_TYPES = ["indicator", "reference", "mortality", "recommendation"];
export const EXPLANATION_KINDS = ["explain", "why", "simpler"];

export const DECLINE_REPLY = "I cannot provide medical advice, a diagnosis, a treatment plan, or a prediction about your own health. This assistant only explains the population-level information already shown on this report. Please speak to a qualified healthcare professional about anything concerning your own health.";

export const NO_MATCH_REPLY = "I can only explain what is already shown on your report. Try naming one of the priority indicators, a figure printed on a card, or one of the suggested actions.";

export const ASSISTANT_NOTICE = "Explanations here are AI-generated, educational only, and may contain errors. They are not medical advice.";

export const EXPLAIN_DISCLAIMERS = {
  generated: "This explanation was AI-generated from the data shown on this page. It is educational only, may contain errors, and does not replace professional medical advice.",
  assembled: "This explanation was assembled directly from the data shown on this page rather than AI-generated. It is educational only, may contain errors, and does not replace professional medical advice.",
  declined: "This assistant is educational only, may contain errors, and does not replace professional medical advice.",
};

const OUT_OF_SCOPE_PATTERNS = [
  // A diagnosis of the person asking.
  /\bdo i have\b/,
  /\bam i (?:at risk|diabetic|hypertensive|sick|ill|unwell)\b/,
  /\bdiagnos(?:e|is|ing) (?:me|my|this|these|it)\b/,
  /\bwhat(?:'s| is)? wrong with me\b/,
  /\bwhat (?:disease|condition|illness) do i\b/,
  /\bis (?:this|it|that) (?:cancer|diabetes|a heart attack|a stroke|serious|dangerous)\b/,
  // Medication or dosage.
  /\b(?:medication|medications|medicine|medicines|drug|drugs|pill|pills|tablet|tablets|dose|doses|dosage|prescription|prescribe|prescribed)\b/,
  /\b\d+\s?(?:mg|ml|mcg)\b/,
  /\bshould i (?:take|start taking|stop taking)\b/,
  // A treatment plan.
  /\btreatment plan\b/,
  /\bhow (?:do|can|should) i (?:treat|cure|fix)\b/,
  /\btreat (?:my|this|these|it)\b/,
  /\b(?:cure|cured|chemotherapy|radiotherapy|surgery)\b/,
  // A prediction about the person's own outcome.
  /\bhow long (?:do|have) i (?:got|have)\b/,
  /\blife expectancy\b/,
  /\bwill i (?:die|get|develop|have)\b/,
  /\bam i going to\b/,
  /\bmy (?:chance|chances|odds|risk|probability) of (?:dying|death|getting|developing)\b/,
  /\bhow likely am i\b/,
  /\bwhen will i\b/,
];

export function checkOutOfScope(text) {
  const value = String(text || "").toLowerCase();
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(value));
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "what", "why", "how", "does", "did", "are", "was", "were", "that", "this",
  "these", "those", "from", "have", "has", "had", "can", "you", "your", "about", "tell", "more", "mean",
  "means", "meaning", "please", "explain", "explanation", "show", "give", "into", "than", "then", "there",
  "their", "not", "but", "get", "got", "out", "see", "say", "just", "like", "much", "many", "some", "any",
  "all", "who", "when", "where", "which", "will", "would", "should", "could", "being", "been", "because",
  "also", "only", "very", "really", "between", "over", "under", "again", "here", "does", "doing", "simpler",
  "simple", "simply", "plain", "understand", "confusing", "confused",
]);

const SYNONYMS = {
  exercise: "activity", exercising: "activity", gym: "activity", fitness: "activity", active: "activity",
  cigarette: "smoking", cigarettes: "smoking", tobacco: "smoking", smoke: "smoking", smoker: "smoking",
  bedtime: "sleep", insomnia: "sleep", tired: "sleep",
  sweets: "sugar", food: "diet", eating: "diet",
  checkup: "screening", tested: "screening", test: "screening",
  died: "deaths", dying: "deaths", death: "deaths",
  diabetic: "diabetes",
};

const REFERENCE_HINTS = "reference value average figure percentage percent number statistic statistics comparison malaysian national";
const MORTALITY_HINTS = "deaths mortality cause causes fatal population context";
const RECOMMENDATION_HINTS = "action step advice suggestion recommendation recommended next";
const INDICATOR_HINTS = "indicator priority area";

function stem(token) {
  let value = token;
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (value.length > suffix.length + 2 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  if (value.endsWith("i")) value = `${value.slice(0, -1)}y`;
  return value.endsWith("e") ? value.slice(0, -1) : value;
}

function tokenSet(text) {
  const tokens = new Set();
  for (const raw of String(text ?? "").toLowerCase().split(/[^a-z0-9.]+/)) {
    const token = raw.replace(/^\.+|\.+$/g, "");
    if (token.length < 2 || STOPWORDS.has(token)) continue;
    if (!/^\d/.test(token) && token.length < 3) continue;
    tokens.add(stem(SYNONYMS[token] || token));
  }
  return tokens;
}

function kindFor(question) {
  const value = String(question || "").toLowerCase();
  if (/\bwhy\b/.test(value) || /\bmatter\b/.test(value)) return "why";
  if (/\b(?:simpler|simply|simple|plain|confus\w*|understand)\b/.test(value)) return "simpler";
  if (/\bwhat does\b.{0,60}\bmeans?\b/.test(value)) return "simpler";
  return "explain";
}

function candidatesFor(result) {
  const candidates = [];
  for (const indicator of result.prioritised_indicators || []) {
    candidates.push({
      target_type: "indicator",
      target_id: indicator.indicator_id,
      strong: tokenSet(`${indicator.indicator_name} ${indicator.description || ""}`),
      weak: tokenSet(INDICATOR_HINTS),
    });
    if (indicator.reference) {
      candidates.push({
        target_type: "reference",
        target_id: indicator.indicator_id,
        strong: tokenSet(`${indicator.indicator_name} ${indicator.reference.reference_value} ${indicator.reference.interpretation || ""}`),
        weak: tokenSet(REFERENCE_HINTS),
      });
    }
    const mortality = indicator.mortality_context || [];
    if (mortality.length) {
      candidates.push({
        target_type: "mortality",
        target_id: indicator.indicator_id,
        strong: tokenSet(mortality.map((row) => `${row.cause_name} ${row.measure_value}`).join(" ")),
        weak: tokenSet(MORTALITY_HINTS),
      });
    }
  }
  for (const recommendation of result.recommendations || []) {
    candidates.push({
      target_type: "recommendation",
      target_id: recommendation.recommendation_id,
      strong: tokenSet(`${recommendation.action_title} ${recommendation.action_description || ""}`),
      weak: tokenSet(RECOMMENDATION_HINTS),
    });
  }
  return candidates;
}

export function resolveQuestion(question, result) {
  const asked = tokenSet(question);
  if (!asked.size || !result) return null;

  let best = null;
  for (const candidate of candidatesFor(result)) {
    let score = 0;
    for (const token of asked) {
      if (candidate.strong.has(token)) score += 2;
      else if (candidate.weak.has(token)) score += 1;
    }
    if (score >= 2 && (!best || score > best.score)) best = { candidate, score };
  }
  if (!best) return null;
  return { target_type: best.candidate.target_type, target_id: best.candidate.target_id, kind: kindFor(question) };
}

export function buildContextPack({ target_type: targetType, kind, indicator, reference, mortality = [], recommendation } = {}) {
  return {
    target_type: targetType || null,
    kind: kind || null,
    indicator: indicator ? { indicator_name: indicator.indicator_name, description: indicator.description } : null,
    reference: reference
      ? {
        reference_value: reference.reference_value,
        unit: reference.unit,
        reference_year: reference.reference_year,
        interpretation: reference.interpretation,
        dataset_name: reference.dataset_name,
        organisation: reference.organisation,
      }
      : null,
    mortality: (mortality || []).slice(0, 3).map((row) => ({
      cause_name: row.cause_name,
      measure_value: row.measure_value,
      measure_unit: row.measure_unit,
      age_group: row.age_group,
      year: row.year,
      dataset_name: row.dataset_name,
    })),
    recommendation: recommendation
      ? {
        action_title: recommendation.action_title,
        action_description: recommendation.action_description,
        explanation: recommendation.explanation,
        first_step: recommendation.first_step,
      }
      : null,
  };
}

function numbersIn(text) {
  return (String(text).match(/\d+(?:\.\d+)?/g) || []).map((value) => String(Number(value)));
}

export function verifyGrounded(reply, pack) {
  if (typeof reply !== "string" || !reply.trim()) return false;
  const allowed = new Set(numbersIn(JSON.stringify(pack)));
  return numbersIn(reply).every((value) => allowed.has(value));
}

export function assembleExplanation(pack) {
  const { target_type: targetType, kind, indicator, reference, mortality, recommendation } = pack;
  const name = indicator?.indicator_name || "This item";
  const value = reference ? `${reference.reference_value}${reference.unit === "percent" ? "%" : ` ${reference.unit}`}` : null;
  const referenceText = reference ? `The Malaysian reference value shown is ${value} from ${reference.reference_year}: ${reference.interpretation}` : "";
  const top = mortality?.[0] || null;
  const unitText = top ? String(top.measure_unit).replace(/^percent_of_/, "").replaceAll("_", " ") : "";
  const mortalityText = top
    ? `The displayed population figure is ${top.cause_name} at ${top.measure_value}% of ${unitText} in ${top.year} (${top.age_group === "all" ? "Malaysia, all ages" : `DOSM age band ${top.age_group}`}).`
    : "No linked population mortality figure is displayed for this item.";
  const actionText = recommendation ? `A displayed preventive action is: ${recommendation.action_title}.` : "No additional action is displayed for this item.";

  const replies = {
    indicator: {
      explain: `${name}: ${indicator?.description || ""} ${referenceText} ${mortalityText} ${actionText}`,
      why: `${name} appears because one of your answers matched a documented rule in the database. ${actionText} These rules describe population-level patterns, not a judgement about your own health.`,
      simpler: `${name} is an area to pay attention to, based on the answers you gave. ${actionText}`,
    },
    reference: {
      explain: `${referenceText} It describes adults across Malaysia as a whole, not you.`,
      why: `This figure is shown so you can see how common this is across Malaysia. ${referenceText} It is a population reference, not an individual target.`,
      simpler: `${value} is the Malaysian figure recorded for ${name} in ${reference?.reference_year}. ${reference?.interpretation || ""} It is a country-wide number.`,
    },
    mortality: {
      explain: `${mortalityText} It comes from the national cause-of-death statistics displayed with this indicator, and it describes the population, not any one person.`,
      why: `This figure is shown to give country-level context for ${name}. ${mortalityText} It does not predict what will happen to any individual.`,
      simpler: `${mortalityText} It is a country-wide count, not a statement about you.`,
    },
    recommendation: {
      explain: `${recommendation?.action_title || "This action"}: ${recommendation?.action_description || ""} ${recommendation?.explanation || ""} A displayed first step is: ${recommendation?.first_step || ""}`,
      why: `${recommendation?.explanation || ""} It is listed under ${name} because that indicator was prioritised from your answers.`,
      simpler: `${recommendation?.action_title || "This action"}. ${recommendation?.first_step || ""}`,
    },
  };

  const reply = replies[targetType]?.[kind] || replies.indicator.explain;
  return reply.replace(/\s+/g, " ").trim();
}
