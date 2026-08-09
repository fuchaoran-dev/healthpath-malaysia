import assert from "node:assert/strict";
import test from "node:test";
import {
  DECLINE_REPLY,
  assembleExplanation,
  buildContextPack,
  checkOutOfScope,
  resolveQuestion,
  verifyGrounded,
} from "../src/explain-safety.mjs";

const rows = {
  indicator: { indicator_id: "indicator_smoking", indicator_name: "Smoking Cessation", description: "Self-reported current smoking status used for preventive prioritisation." },
  reference: { reference_value: 19, unit: "percent", reference_year: 2023, interpretation: "Current tobacco smokers among adults.", dataset_name: "NHMS 2023 Fact Sheet", organisation: "Institute for Public Health" },
  mortality: [{ mortality_id: "mort_2024_ihd_41_59", cause_name: "Ischaemic heart diseases", measure_value: 17.6, measure_unit: "percent_of_age_group_medically_certified_deaths", age_group: "41-59", year: 2024, gender: "all", ethnicity: "all", state: "Malaysia", dataset_name: "Statistics on Causes of Death" }],
  recommendation: { recommendation_id: "rec_smoke_free", action_title: "Plan a smoke-free week", action_description: "Choose a quit date and ask a qualified healthcare professional about available support.", explanation: "This addresses the smoking habit reported in your profile.", first_step: "Write down one reason you want to stop and tell a trusted person." },
};

const result = {
  profile: { age_group: "45-49", gender: "male", state: "Johor" },
  prioritised_indicators: [{
    indicator_id: "indicator_smoking",
    indicator_name: "Smoking Cessation",
    description: rows.indicator.description,
    reference: rows.reference,
    mortality_context: rows.mortality,
  }],
  recommendations: [{ ...rows.recommendation, indicator_id: "indicator_smoking" }],
};

const pack = buildContextPack({ target_type: "indicator", kind: "explain", ...rows });

test("a request for a diagnosis is out of scope", () => {
  assert.equal(checkOutOfScope("do i have diabetes?"), true);
});

test("a request about medication is out of scope", () => {
  assert.equal(checkOutOfScope("what dosage of medication should i take"), true);
});

test("a request for a treatment plan is out of scope", () => {
  assert.equal(checkOutOfScope("give me a treatment plan for this"), true);
});

test("a request to predict the reader's own outcome is out of scope", () => {
  assert.equal(checkOutOfScope("how long do i have to live and will i die of this"), true);
});

test("an ordinary question about a displayed figure is in scope", () => {
  assert.equal(checkOutOfScope("what does the smoking percentage mean"), false);
});

test("seeded copy that mentions diagnosis is not treated as out of scope", () => {
  assert.equal(checkOutOfScope("This connects the family-history response to a preventive next step without diagnosing you."), false);
  assert.equal(checkOutOfScope("Screening is preventive context; this does not imply a diagnosis."), false);
});

test("the decline states it cannot give medical advice and names a professional", () => {
  assert.match(DECLINE_REPLY, /cannot provide medical advice/i);
  assert.match(DECLINE_REPLY, /qualified healthcare professional/i);
});

test("a question naming an indicator resolves to that indicator", () => {
  assert.deepEqual(resolveQuestion("what is smoking cessation", result), { target_type: "indicator", target_id: "indicator_smoking", kind: "explain" });
});

test("a question about a displayed number resolves to the reference value", () => {
  assert.deepEqual(resolveQuestion("what does the 19 percent smoking figure mean", result), { target_type: "reference", target_id: "indicator_smoking", kind: "simpler" });
});

test("a question naming a cause of death resolves to the mortality context", () => {
  const target = resolveQuestion("tell me about the ischaemic heart deaths", result);
  assert.equal(target.target_type, "mortality");
  assert.equal(target.target_id, "indicator_smoking");
});

test("a question naming a suggested action resolves to that recommendation", () => {
  const target = resolveQuestion("why is a smoke-free week suggested", result);
  assert.equal(target.target_type, "recommendation");
  assert.equal(target.target_id, "rec_smoke_free");
  assert.equal(target.kind, "why");
});

test("a question about something not on the report resolves to nothing", () => {
  assert.equal(resolveQuestion("what about air pollution in Kuala Lumpur", result), null);
});

test("an empty question resolves to nothing", () => {
  assert.equal(resolveQuestion("   ", result), null);
});

test("the context pack carries no profile answer", () => {
  const serialised = JSON.stringify(pack);
  for (const value of ["45-49", "Johor", "session", "lifestyle", "family_history"]) {
    assert.equal(serialised.includes(value), false, `context pack leaked ${value}`);
  }
  // The DOSM band on a mortality row is a published dataset label, not the
  // reader's age group, and it is printed on the card.
  assert.equal(pack.mortality[0].age_group, "41-59");
});

test("the context pack drops the non-displayed columns on a mortality row", () => {
  for (const column of ["gender", "ethnicity", "state", "mortality_id"]) {
    assert.equal(column in pack.mortality[0], false, `context pack kept ${column}`);
  }
});

test("the context pack keeps the published fields the page displays", () => {
  assert.equal(pack.reference.reference_value, 19);
  assert.equal(pack.mortality[0].measure_value, 17.6);
  assert.equal(pack.recommendation.action_title, "Plan a smoke-free week");
});

test("a reply whose numbers all appear in the context pack is grounded", () => {
  assert.equal(verifyGrounded("About 19% of Malaysian adults smoked in 2023, and heart disease was 17.6% of deaths in that age band.", pack), true);
});

test("a reply introducing a number outside the context pack is not grounded", () => {
  assert.equal(verifyGrounded("Smoking causes 42% of deaths in Malaysia.", pack), false);
});

test("an empty reply is not grounded", () => {
  assert.equal(verifyGrounded("   ", pack), false);
});

test("the assembled fallback only uses numbers from the context pack", () => {
  for (const kind of ["explain", "why", "simpler"]) {
    for (const targetType of ["indicator", "reference", "mortality", "recommendation"]) {
      const reply = assembleExplanation(buildContextPack({ target_type: targetType, kind, ...rows }));
      assert.equal(verifyGrounded(reply, pack), true, `${targetType}/${kind} introduced a number`);
    }
  }
});

test("the assembled fallback is never itself out of scope", () => {
  const reply = assembleExplanation(buildContextPack({ target_type: "recommendation", kind: "explain", ...rows }));
  assert.equal(checkOutOfScope(reply), false);
});

test("the assembled fallback explains a clinical term it takes from seeded copy", () => {
  const reply = assembleExplanation(buildContextPack({ target_type: "mortality", kind: "explain", ...rows }));
  assert.match(reply, /Ischaemic heart diseases \(heart problems caused by reduced blood flow\)/);
  assert.match(reply, /medically certified deaths \(deaths where a doctor recorded the cause\)/);
});

test("the assembled fallback explains a clinical term in a reference interpretation", () => {
  const cholesterol = {
    indicator: { indicator_name: "Cholesterol Health", description: "Reference indicator for cholesterol prevention context." },
    reference: { reference_value: 33.3, unit: "percent", reference_year: 2023, interpretation: "Hypercholesterolaemia prevalence among Malaysian adults.", dataset_name: "NHMS 2023 Fact Sheet", organisation: "Institute for Public Health" },
  };
  const reply = assembleExplanation(buildContextPack({ target_type: "reference", kind: "explain", ...cholesterol }));
  assert.match(reply, /Hypercholesterolaemia \(too much cholesterol in the blood\)/);
  assert.match(reply, /prevalence \(how common something is across a population\)/);
});

test("a term the fallback explains is explained once, not at every mention", () => {
  const repeated = {
    indicator: { indicator_name: "Blood Pressure Health", description: "Hypertension context for preventive prioritisation." },
    reference: { reference_value: 29.2, unit: "percent", reference_year: 2023, interpretation: "Hypertension prevalence among Malaysian adults.", dataset_name: "NHMS 2023 Fact Sheet", organisation: "Institute for Public Health" },
  };
  const reply = assembleExplanation(buildContextPack({ target_type: "indicator", kind: "explain", ...repeated }));
  assert.equal(reply.match(/\(high blood pressure\)/g).length, 1);
});

test("explaining a clinical term introduces no number of its own", () => {
  for (const kind of ["explain", "why", "simpler"]) {
    for (const targetType of ["indicator", "reference", "mortality", "recommendation"]) {
      const reply = assembleExplanation(buildContextPack({ target_type: targetType, kind, ...rows }));
      assert.equal(verifyGrounded(reply, pack), true, `${targetType}/${kind} introduced a number`);
      assert.equal(checkOutOfScope(reply), false, `${targetType}/${kind} became out of scope`);
    }
  }
});
