# HealthPath Malaysia

HealthPath Malaysia is a React + Express application for adults aged 40–60. It uses official Malaysian population datasets to provide plain-language, non-diagnostic preventive-health context. It supports local SQLite development and cloud PostgreSQL deployment.

## Run locally

The project uses Node.js 22.5+ because it uses the built-in `node:sqlite` module.

```bash
cd /Users/fuchouzen/sihatq-prototype-main/healthpath
npm install
npm run seed
npm run build
npm start
```

Open `http://localhost:3000`.

For development, use two terminals:

```bash
npm run dev       # Vite preview at http://localhost:5173
npm start         # Express API at http://localhost:3000
```

The production-style start serves the built React application and the Express API from port 3000. Without `DATABASE_URL`, it uses local SQLite for offline development.

## Team setup

Clone the repository, then create a private environment file from the committed template:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd healthpath
npm install
cp .env.example .env
```

Open `.env` and add the current Neon connection string. Never commit `.env` or send the connection string in a public chat. The npm scripts automatically load `.env` with Node.js 22.5+.

One team member should seed the shared Neon database once:

```bash
npm run seed:postgres
npm run check:postgres
```

Each team member can then run:

```bash
npm run build
npm start
```

Open `http://localhost:3000`. A teammate can use the application as an anonymous session without creating an account. If the team only wants to run an offline local SQLite copy, remove or rename `.env`, then run `npm run seed` and `npm start`.

## Cloud PostgreSQL deployment

The same application switches to PostgreSQL when `DATABASE_URL` is present. It works with Neon, Railway PostgreSQL, Render PostgreSQL, or another standard PostgreSQL provider; Supabase is not required.

Set the environment variables in the cloud provider dashboard, then run the migration/seed command once:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require'
export DATABASE_SSL=true
npm run seed:postgres
npm run build
npm start
```

After seeding, verify both public-data reads and anonymous transaction writes with `npm run check:postgres`.

For a deployment service, use `npm install && npm run build` as the build command and `npm start` as the start command. Add `DATABASE_URL` and `DATABASE_SSL=true` to the service environment. `server-entry.mjs` selects PostgreSQL automatically when `DATABASE_URL` exists. The PostgreSQL server creates missing tables on startup, while `npm run seed:postgres` imports the public datasets and reference data.

Never commit a real connection string. Use `.env.example` as the variable-name template and store the actual password in the cloud provider's secret/environment-variable settings.

## Database

SQLite stores only public/application reference data:

- `data_sources`
- `causes_of_death`
- `mortality_data`
- `annual_deaths_by_state`
- `population_by_state`
- `screenings_by_state`
- `health_indicators`
- `reference_values`
- `prioritisation_rules`
- `recommendations`
- `indicator_cause_link`

When PostgreSQL is enabled, these additional tables provide anonymous read/write access:

- `user_sessions`
- `user_profiles`
- `assessment_results`
- `user_goals`

There is still no login or permanent account. The browser creates an opaque random `session_id`; only broad profile answers, generated report JSON and selected goals are associated with it. The front end caches the same information in `localStorage` for the temporary session, and the API is the source of cloud reads/writes.

## Read/write API

The cloud server exposes:

- `GET /api/health` — confirms `database: PostgreSQL` and `write_api: true`.
- `POST /api/session/consent` — records or withdraws anonymous-session consent.
- `GET /api/session/:session_id` — reads the session profile, report and goals.
- `POST /api/assess` — calculates an assessment and writes the profile/report when consent is accepted.
- `GET /api/goals?session_id=...` — reads goals.
- `POST /api/goals` — creates a goal.
- `PATCH /api/goals/:recommendation_id` — updates progress/completion.
- `DELETE /api/goals/:recommendation_id?session_id=...` — deletes a goal.
- `DELETE /api/session/:session_id` — clears the anonymous cloud session.

`npm run seed` imports the official CSV files stored in `db/source-data/` and inserts the official DOSM mortality summary and NHMS 2023 reference values. Run `npm run check:db` to inspect row counts and foreign-key integrity.

## Official data sources

- DOSM, *Statistics on Causes of Death, Malaysia 2025* — reports deaths occurring in 2024. The mortality context is population-level and medically certified deaths are a subset of total deaths.
- DOSM, *Population Table: States* — state population by year, sex, age group and ethnicity.
- DOSM/JPN, *Annual Deaths by State, Sex, and Ethnicity* — annual death counts by usual residence, sex and ethnicity; not cause-specific.
- ProtectHealth/MOH, *Daily PeKaB40 Health Screenings by State* — daily screening activity, not disease prevalence.
- Institute for Public Health, *NHMS 2023 Fact Sheet* — aggregate Malaysian adult reference values for activity, sleep, smoking, screening, diet, diabetes, hypertension and cholesterol.

Verify the latest source notes and reuse terms before publication. Data is never used to predict individual mortality, life expectancy, diagnosis or treatment needs.

## Tests

```bash
node --test test/*.test.mjs
```

Tests cover deterministic rule matching, broad family-history handling, seed data, source/year retention and foreign-key integrity.
