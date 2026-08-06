INSERT OR IGNORE INTO data_sources
  (source_id, organisation, dataset_name, publication_year, source_url, license, notes)
VALUES
  ('src_dosm_cod_2025', 'Department of Statistics Malaysia', 'Statistics on Causes of Death, Malaysia 2025', 2025,
   'https://www.dosm.gov.my/portal-main/release-content/statistics-on-causes-of-death-malaysia-2025',
   'Official publication; verify reuse terms',
   'Reports deaths occurring in 2024. Mortality context is population-level and medically certified deaths represent 67.3% of total deaths.'),
  ('src_dosm_population_state', 'Department of Statistics Malaysia', 'Population Table: States', 2025,
   'https://data.gov.my/data-catalogue/population_state', 'CC BY 4.0',
   'Population is supplied in thousands of people.'),
  ('src_dosm_deaths_state', 'Department of Statistics Malaysia / National Registration Department', 'Annual Deaths by State, Sex, and Ethnicity', 2024,
   'https://data.gov.my/data-catalogue/deaths_sex_ethnic_state', 'CC BY 4.0',
   'State represents usual residence of the deceased; this dataset is not cause-specific.'),
  ('src_peka_b40', 'ProtectHealth Corporation / Ministry of Health Malaysia', 'Daily PeKaB40 Health Screenings by State', 2026,
   'https://data.gov.my/data-catalogue/pekab40_screenings_state', 'CC BY 4.0',
   'Daily screening activity by state, not disease prevalence or individual health status.'),
  ('src_nhms_2023', 'Institute for Public Health, Ministry of Health Malaysia', 'NHMS 2023 Fact Sheet: Non-Communicable Diseases and Healthcare Demand', 2023,
   'https://iku.gov.my/images/nhms2023/fact-sheet-nhms-2023.pdf', 'Official publication; verify reuse terms',
   'Aggregate Malaysian adult reference values transcribed from the official fact sheet.');

INSERT OR IGNORE INTO causes_of_death (cause_id, cause_name, category, description) VALUES
  ('cause_ihd', 'Ischaemic heart diseases', 'cardiovascular', 'Population-level mortality context from DOSM.'),
  ('cause_pneumonia', 'Pneumonia', 'respiratory', 'Population-level mortality context from DOSM.'),
  ('cause_diabetes', 'Diabetes mellitus', 'metabolic', 'Population-level mortality context from DOSM.'),
  ('cause_transport', 'Transport accidents', 'external_cause', 'Population-level mortality context from DOSM.');

INSERT OR IGNORE INTO health_indicators (indicator_id, indicator_name, description, default_unit) VALUES
  ('indicator_activity', 'Physical Activity', 'Self-reported activity level used for preventive prioritisation.', 'percent'),
  ('indicator_sleep', 'Sleep Health', 'Self-reported sleep duration used for preventive prioritisation.', 'percent'),
  ('indicator_smoking', 'Smoking Cessation', 'Self-reported current smoking status used for preventive prioritisation.', 'percent'),
  ('indicator_screening', 'Preventive Screening', 'Self-reported recent screening and public screening context.', 'percent'),
  ('indicator_diet', 'Diet and Sugar Intake', 'Self-reported high-sugar habit used for preventive prioritisation.', 'percent'),
  ('indicator_diabetes', 'Diabetes Prevention', 'Reference indicator for diabetes prevention context.', 'percent'),
  ('indicator_hypertension', 'Blood Pressure Health', 'Reference indicator for hypertension prevention context.', 'percent'),
  ('indicator_cholesterol', 'Cholesterol Health', 'Reference indicator for cholesterol prevention context.', 'percent');

INSERT OR IGNORE INTO mortality_data
  (mortality_id, cause_id, year, age_group, gender, ethnicity, state, death_count, measure_value, measure_unit, source_id, note)
VALUES
  ('mort_2024_ihd_all', 'cause_ihd', 2024, 'all', 'all', 'all', 'Malaysia', 17421, 13.0, 'percent_of_medically_certified_deaths', 'src_dosm_cod_2025', 'Principal cause of medically certified deaths in 2024.'),
  ('mort_2024_pneumonia_all', 'cause_pneumonia', 2024, 'all', 'all', 'all', 'Malaysia', 15332, 11.5, 'percent_of_medically_certified_deaths', 'src_dosm_cod_2025', 'Second highest cause of medically certified deaths in 2024.'),
  ('mort_2024_diabetes_all', 'cause_diabetes', 2024, 'all', 'all', 'all', 'Malaysia', 6929, 5.2, 'percent_of_medically_certified_deaths', 'src_dosm_cod_2025', 'Third highest cause of medically certified deaths in 2024.'),
  ('mort_2024_transport_all', 'cause_transport', 2024, 'all', 'all', 'all', 'Malaysia', 4428, 3.3, 'percent_of_medically_certified_deaths', 'src_dosm_cod_2025', 'Fourth highest cause of medically certified deaths in 2024.'),
  ('mort_2024_transport_15_40', 'cause_transport', 2024, '15-40', 'all', 'all', 'Malaysia', 2547, 20.0, 'percent_of_age_group_medically_certified_deaths', 'src_dosm_cod_2025', 'Principal cause for ages 15-40.'),
  ('mort_2024_ihd_41_59', 'cause_ihd', 2024, '41-59', 'all', 'all', 'Malaysia', 5380, 17.6, 'percent_of_age_group_medically_certified_deaths', 'src_dosm_cod_2025', 'Principal cause for ages 41-59.'),
  ('mort_2024_pneumonia_60_plus', 'cause_pneumonia', 2024, '60+', 'all', 'all', 'Malaysia', 11989, 13.9, 'percent_of_age_group_medically_certified_deaths', 'src_dosm_cod_2025', 'Principal cause for ages 60 and over.');

INSERT OR IGNORE INTO reference_values
  (reference_id, indicator_id, age_group, gender, state, reference_value, unit, interpretation, reference_year, source_id)
VALUES
  ('ref_nhms_2023_activity', 'indicator_activity', 'all', 'all', 'Malaysia', 29.9, 'percent', 'Adults reported as physically inactive.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_sleep', 'indicator_sleep', 'all', 'all', 'Malaysia', 37.7, 'percent', 'Adults reporting insufficient sleep.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_smoking', 'indicator_smoking', 'all', 'all', 'Malaysia', 19.0, 'percent', 'Current tobacco smokers among adults.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_screening', 'indicator_screening', 'all', 'all', 'Malaysia', 57.2, 'percent', 'Adults reporting NCD screening or examination in the previous year.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_diet', 'indicator_diet', 'all', 'all', 'Malaysia', 95.1, 'percent', 'Adults not taking the recommended five servings of fruit and vegetables daily.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_diabetes', 'indicator_diabetes', 'all', 'all', 'Malaysia', 15.6, 'percent', 'Diabetes prevalence among Malaysian adults.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_hypertension', 'indicator_hypertension', 'all', 'all', 'Malaysia', 29.2, 'percent', 'Hypertension prevalence among Malaysian adults.', 2023, 'src_nhms_2023'),
  ('ref_nhms_2023_cholesterol', 'indicator_cholesterol', 'all', 'all', 'Malaysia', 33.3, 'percent', 'Hypercholesterolaemia prevalence among Malaysian adults.', 2023, 'src_nhms_2023');

INSERT OR IGNORE INTO prioritisation_rules
  (rule_id, indicator_id, profile_factor, condition_operator, condition_value, priority_score, explanation)
VALUES
  ('rule_smoking', 'indicator_smoking', 'smoker', '=', 'true', 95, 'Smoking is a modifiable behaviour that deserves a high preventive priority.'),
  ('rule_activity', 'indicator_activity', 'physical_activity', '=', 'low', 90, 'Low reported physical activity is a practical area for preventive action.'),
  ('rule_screening', 'indicator_screening', 'recent_screening', '=', 'no', 85, 'No recent screening means a basic preventive check may be worth arranging.'),
  ('rule_sleep', 'indicator_sleep', 'sleep_hours', '<', '6', 80, 'Less than six hours of sleep is a self-reported habit to review.'),
  ('rule_family_diabetes', 'indicator_diabetes', 'family_history', 'contains', 'diabetes', 75, 'Family history of diabetes increases the priority of preventive education and screening.'),
  ('rule_diet', 'indicator_diet', 'diet_high_sugar', '=', 'true', 65, 'A high-sugar habit is a practical target for healthier daily choices.');

INSERT OR IGNORE INTO recommendations
  (recommendation_id, indicator_id, action_title, action_description, explanation, first_step, source_id)
VALUES
  ('rec_smoke_free', 'indicator_smoking', 'Plan a smoke-free week', 'Choose a quit date and ask a qualified healthcare professional about available support.', 'This addresses the smoking habit reported in your profile.', 'Write down one reason you want to stop and tell a trusted person.', 'src_nhms_2023'),
  ('rec_walk', 'indicator_activity', 'Walk for 15 minutes after lunch', 'Try a 15-minute walk after lunch three times this week.', 'This is a small, achievable action for a low activity response.', 'Put three 15-minute walks in your calendar.', 'src_nhms_2023'),
  ('rec_screening', 'indicator_screening', 'Arrange a basic health screening', 'Consider arranging a basic screening with a qualified healthcare provider.', 'This addresses the absence of a recent screening response.', 'Contact a clinic or screening programme to ask what is available.', 'src_peka_b40'),
  ('rec_sleep', 'indicator_sleep', 'Keep a consistent bedtime', 'Choose a weekday bedtime and keep it consistent for one week.', 'A regular schedule is a practical first step when sleep duration is low.', 'Set a reminder 30 minutes before your target bedtime.', 'src_nhms_2023'),
  ('rec_glucose', 'indicator_diabetes', 'Ask about diabetes screening', 'Ask a qualified healthcare provider whether a routine blood-glucose screening is appropriate.', 'This connects the family-history response to a preventive next step without diagnosing you.', 'Write down the question you want to ask at your next clinic visit.', 'src_nhms_2023'),
  ('rec_sugary_drink', 'indicator_diet', 'Replace one sugary drink with water', 'Replace one sugary drink with water or an unsweetened drink each day this week.', 'This is a simple way to reduce the high-sugar habit reported in your profile.', 'Choose the drink you will replace first.', 'src_nhms_2023');

INSERT OR IGNORE INTO indicator_cause_link (indicator_id, cause_id, relationship_note) VALUES
  ('indicator_activity', 'cause_ihd', 'Cardiovascular mortality context only; this does not predict individual outcomes.'),
  ('indicator_smoking', 'cause_ihd', 'Cardiovascular mortality context only; this does not predict individual outcomes.'),
  ('indicator_diabetes', 'cause_diabetes', 'Diabetes mortality context only; this does not predict individual outcomes.'),
  ('indicator_screening', 'cause_ihd', 'Screening is preventive context; this does not imply a diagnosis.'),
  ('indicator_diet', 'cause_diabetes', 'Diabetes mortality context only; this does not predict individual outcomes.');

INSERT OR IGNORE INTO rule_recommendation (rule_id, recommendation_id) VALUES
  ('rule_smoking', 'rec_smoke_free'),
  ('rule_activity', 'rec_walk'),
  ('rule_screening', 'rec_screening'),
  ('rule_sleep', 'rec_sleep'),
  ('rule_family_diabetes', 'rec_glucose'),
  ('rule_diet', 'rec_sugary_drink');
