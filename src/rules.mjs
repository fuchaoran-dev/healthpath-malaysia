export function profileFactorValue(profile, factor) {
  if (factor === "family_history") return profile.family_history;
  if (factor === "age_group") return profile.age_group;
  return profile.lifestyle?.[factor];
}

export function ruleMatches(profile, rule) {
  const actual = profileFactorValue(profile, rule.profile_factor);
  const expected = rule.condition_value;
  if (rule.condition_operator === "contains") return Array.isArray(actual) && actual.includes(expected);
  if (rule.condition_operator === "=") return String(actual) === expected;
  if (rule.condition_operator === "<") return Number(actual) < Number(expected);
  if (rule.condition_operator === ">") return Number(actual) > Number(expected);
  return false;
}
