import assert from "node:assert/strict";
import test from "node:test";
import { profileFactorValue, ruleMatches } from "../src/rules.mjs";

const profile = {
  age_group: "45-49",
  family_history: ["diabetes"],
  lifestyle: {
    physical_activity: "low",
    sleep_hours: 5,
    smoker: true,
    diet_high_sugar: true,
    recent_screening: "no",
  },
};

test("a rule matches a low-activity response", () => {
  assert.equal(ruleMatches(profile, { profile_factor: "physical_activity", condition_operator: "=", condition_value: "low" }), true);
});

test("a sleep rule matches below six hours", () => {
  assert.equal(ruleMatches(profile, { profile_factor: "sleep_hours", condition_operator: "<", condition_value: "6" }), true);
});

test("a family-history rule uses broad categories", () => {
  assert.equal(ruleMatches(profile, { profile_factor: "family_history", condition_operator: "contains", condition_value: "diabetes" }), true);
  assert.equal(profileFactorValue(profile, "family_history").includes("relative"), false);
});

test("an identical profile produces the same rule outcomes", () => {
  const rule = { profile_factor: "smoker", condition_operator: "=", condition_value: "true" };
  assert.equal(ruleMatches(profile, rule), ruleMatches(structuredClone(profile), rule));
});

test("a high activity response does not match the low-activity rule", () => {
  assert.equal(ruleMatches({ ...profile, lifestyle: { ...profile.lifestyle, physical_activity: "high" } }, { profile_factor: "physical_activity", condition_operator: "=", condition_value: "low" }), false);
});
