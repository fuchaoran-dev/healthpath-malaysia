CREATE TABLE IF NOT EXISTS data_sources (
  source_id TEXT PRIMARY KEY,
  organisation TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  publication_year INTEGER,
  source_url TEXT,
  license TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS causes_of_death (
  cause_id TEXT PRIMARY KEY,
  cause_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS health_indicators (
  indicator_id TEXT PRIMARY KEY,
  indicator_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  default_unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mortality_data (
  mortality_id TEXT PRIMARY KEY,
  cause_id TEXT NOT NULL REFERENCES causes_of_death(cause_id),
  year INTEGER NOT NULL,
  age_group TEXT NOT NULL DEFAULT 'all',
  gender TEXT NOT NULL DEFAULT 'all',
  ethnicity TEXT NOT NULL DEFAULT 'all',
  state TEXT NOT NULL DEFAULT 'Malaysia',
  death_count INTEGER,
  measure_value DOUBLE PRECISION NOT NULL,
  measure_unit TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id),
  note TEXT
);

CREATE TABLE IF NOT EXISTS annual_deaths_by_state (
  death_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id),
  year INTEGER NOT NULL,
  state TEXT NOT NULL,
  sex TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  death_count INTEGER NOT NULL CHECK (death_count >= 0),
  UNIQUE (source_id, year, state, sex, ethnicity)
);

CREATE TABLE IF NOT EXISTS population_by_state (
  population_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id),
  year INTEGER NOT NULL,
  state TEXT NOT NULL,
  sex TEXT NOT NULL,
  age_group TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  population_thousands DOUBLE PRECISION NOT NULL CHECK (population_thousands >= 0),
  UNIQUE (source_id, year, state, sex, age_group, ethnicity)
);

CREATE TABLE IF NOT EXISTS screenings_by_state (
  screening_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id),
  date TEXT NOT NULL,
  state TEXT NOT NULL,
  screening_count INTEGER NOT NULL CHECK (screening_count >= 0),
  UNIQUE (source_id, date, state)
);

CREATE TABLE IF NOT EXISTS reference_values (
  reference_id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL REFERENCES health_indicators(indicator_id),
  age_group TEXT NOT NULL DEFAULT 'all',
  gender TEXT NOT NULL DEFAULT 'all',
  state TEXT NOT NULL DEFAULT 'Malaysia',
  reference_value DOUBLE PRECISION NOT NULL CHECK (reference_value >= 0),
  unit TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  reference_year INTEGER NOT NULL,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id),
  UNIQUE (indicator_id, age_group, gender, state, reference_year)
);

CREATE TABLE IF NOT EXISTS prioritisation_rules (
  rule_id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL REFERENCES health_indicators(indicator_id),
  profile_factor TEXT NOT NULL,
  condition_operator TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  priority_score INTEGER NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  explanation TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL REFERENCES health_indicators(indicator_id),
  action_title TEXT NOT NULL,
  action_description TEXT NOT NULL,
  explanation TEXT NOT NULL,
  first_step TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES data_sources(source_id)
);

CREATE TABLE IF NOT EXISTS indicator_cause_link (
  indicator_id TEXT NOT NULL REFERENCES health_indicators(indicator_id),
  cause_id TEXT NOT NULL REFERENCES causes_of_death(cause_id),
  relationship_note TEXT NOT NULL,
  PRIMARY KEY (indicator_id, cause_id)
);

CREATE TABLE IF NOT EXISTS rule_recommendation (
  rule_id TEXT NOT NULL REFERENCES prioritisation_rules(rule_id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
  PRIMARY KEY (rule_id, recommendation_id)
);

-- Anonymous session tables: no account, name, email, NRIC or exact birth date is stored.
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  session_id TEXT PRIMARY KEY REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_results (
  session_id TEXT PRIMARY KEY REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  result_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_goals (
  goal_id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(recommendation_id),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  complete BOOLEAN NOT NULL DEFAULT FALSE,
  start_date TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, recommendation_id)
);

CREATE INDEX IF NOT EXISTS idx_mortality_year_cause ON mortality_data(year, cause_id);
CREATE INDEX IF NOT EXISTS idx_annual_deaths_state_year ON annual_deaths_by_state(state, year);
CREATE INDEX IF NOT EXISTS idx_population_state_year ON population_by_state(state, year);
CREATE INDEX IF NOT EXISTS idx_screenings_state_date ON screenings_by_state(state, date);
CREATE INDEX IF NOT EXISTS idx_reference_indicator ON reference_values(indicator_id, reference_year);
CREATE INDEX IF NOT EXISTS idx_rules_indicator ON prioritisation_rules(indicator_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_session ON user_goals(session_id);
