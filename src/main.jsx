import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const AGE_GROUPS = ["40-44", "45-49", "50-54", "55-60"];
const GENDERS = ["male", "female", "prefer_not_to_say"];
const FAMILY_HISTORY = ["heart_disease", "diabetes", "cancer", "stroke", "none", "unsure"];
const STATES = ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya"];
const STORAGE = {
  sessionId: "healthpath-session-id",
  consent: "healthpath-consent",
  profile: "healthpath-profile",
  result: "healthpath-result",
  goals: "healthpath-goals",
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSessionId() {
  const existing = readStorage(STORAGE.sessionId, null);
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  saveStorage(STORAGE.sessionId, created);
  return created;
}

function formatFactor(factor, value) {
  if (factor === "family_history") return Array.isArray(value) ? value.join(", ").replaceAll("_", " ") : value;
  if (factor === "smoker" || factor === "diet_high_sugar") return value ? "yes" : "no";
  return String(value).replaceAll("_", " ");
}

function Disclaimer({ children }) {
  return <p className="disclaimer">{children || "This information is educational and based on population-level Malaysian data. It does not predict individual outcomes and does not replace professional medical advice."}</p>;
}

function Header({ page, setPage, hasResult, clearSession }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => setPage("home")} aria-label="HealthPath Malaysia home">
        <span className="brand-mark">+</span>
        <span>HealthPath <em>Malaysia</em></span>
      </button>
      <nav className="nav-links" aria-label="Main navigation">
        <button className={page === "insights" ? "active" : ""} onClick={() => setPage("insights")}>General insights</button>
        {hasResult && <button className={page === "report" ? "active" : ""} onClick={() => setPage("report")}>My report</button>}
        <button className={page === "sources" ? "active" : ""} onClick={() => setPage("sources")}>Data sources</button>
        {hasResult && <button className={page === "goals" ? "active" : ""} onClick={() => setPage("goals")}>Goals</button>}
      </nav>
      <button className="clear-button" onClick={clearSession}>Clear session</button>
    </header>
  );
}

function Home({ setPage }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Population data made practical</p>
          <h1>Understand your next healthy step.</h1>
          <p className="hero-text">HealthPath Malaysia turns official Malaysian population statistics into plain-language, non-diagnostic preventive-health insights for adults aged 40–60.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setPage("privacy")}>Start a private session <span>→</span></button>
            <button className="secondary-button" onClick={() => setPage("insights")}>Explore general data</button>
          </div>
          <Disclaimer />
        </div>
        <div className="hero-panel">
          <div className="hero-stat"><strong>4</strong><span>official open-data themes</span></div>
          <div className="hero-stat"><strong>0</strong><span>accounts or permanent profiles</span></div>
          <div className="hero-stat"><strong>100%</strong><span>rule-based prioritisation</span></div>
        </div>
      </section>
      <section className="feature-grid">
        <article><span className="feature-icon">◎</span><h3>Privacy first</h3><p>No name, NRIC, email or diagnosis is requested. A temporary anonymous session keeps the experience connected.</p></article>
        <article><span className="feature-icon">↗</span><h3>Official context</h3><p>Compare displayed indicators with Malaysian reference values and population-level mortality context.</p></article>
        <article><span className="feature-icon">✓</span><h3>Small actions</h3><p>Receive practical, ordered next steps instead of a medical risk prediction.</p></article>
      </section>
    </main>
  );
}

function Privacy({ consent, setConsent, setPage, sessionId, cloudEnabled }) {
  const [checked, setChecked] = useState(consent === "accepted");
  function accept() {
    if (!checked) return;
    saveStorage(STORAGE.consent, "accepted");
    fetch("/api/session/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, accepted: true }) }).catch(() => {});
    setConsent("accepted");
    setPage("profile");
  }
  function decline() {
    localStorage.removeItem(STORAGE.profile);
    localStorage.removeItem(STORAGE.result);
    fetch("/api/session/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, accepted: false }) }).catch(() => {});
    saveStorage(STORAGE.consent, "declined");
    setConsent("declined");
    setPage("insights");
  }
  return (
    <main className="narrow-page">
      <p className="eyebrow">Before you continue</p>
      <h1>Privacy notice</h1>
      <p className="lead">HealthPath asks only for broad, self-reported answers to create a temporary educational explanation.</p>
      <div className="notice-card">
        <h3>We collect</h3>
        <ul><li>Age group, gender and Malaysian state</li><li>Physical activity, sleep, smoking, diet and recent screening answers</li><li>Broad family-history categories only</li></ul>
        <h3>We do not collect</h3>
        <ul><li>Name, email, phone, NRIC/MyKad or exact birthday</li><li>Address, GPS location, diagnosis, medication or laboratory results</li><li>Names or clinical details of relatives</li></ul>
        <p className="small-note">{cloudEnabled ? "An anonymous session ID is used to sync your profile, report and goals to the project database. No account or direct identifier is required." : "In local development, profile, consent, goals and the generated report are stored in this browser&apos;s local storage."} Clear the session at any time to remove them.</p>
      </div>
      <label className="consent-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> <span>I have read this notice and consent to a temporary personalised session.</span></label>
      <div className="button-row"><button className="primary-button" disabled={!checked} onClick={accept}>Accept and continue</button><button className="secondary-button" onClick={decline}>Decline and browse general content</button></div>
      <Disclaimer />
    </main>
  );
}

function Profile({ profile, setProfile, setResult, setPage, sessionId }) {
  const [form, setForm] = useState(profile || { age_group: "", gender: "", state: "", lifestyle: { physical_activity: "", sleep_hours: "", smoker: false, diet_high_sugar: false, recent_screening: "" }, family_history: [] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  function update(path, value) {
    setForm((current) => {
      if (path === "lifestyle") return { ...current, lifestyle: { ...current.lifestyle, ...value } };
      return { ...current, [path]: value };
    });
  }
  function toggleFamily(value) {
    setForm((current) => {
      if (value === "none" || value === "unsure") return { ...current, family_history: current.family_history.includes(value) ? [] : [value] };
      const rest = current.family_history.filter((item) => item !== "none" && item !== "unsure");
      return { ...current, family_history: rest.includes(value) ? rest.filter((item) => item !== value) : [...rest, value] };
    });
  }
  async function submit(event) {
    event.preventDefault();
    setLoading(true); setErrors({});
    const response = await fetch("/api/assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, session_id: sessionId }) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setErrors(data.fieldErrors || { form: data.error }); return; }
    saveStorage(STORAGE.profile, form); saveStorage(STORAGE.result, data); setProfile(form); setResult(data); setPage("report");
  }
  return (
    <main className="narrow-page">
      <p className="eyebrow">Temporary health profile</p><h1>Tell us about your current habits</h1><p className="lead">These answers are used to order preventive indicators. They are not a diagnosis or a medical risk score.</p>
      <form onSubmit={submit} className="form-card">
        <Field label="Age group" error={errors.age_group}><select value={form.age_group} onChange={(event) => update("age_group", event.target.value)}><option value="">Select age group</option>{AGE_GROUPS.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Gender" error={errors.gender}><select value={form.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Select gender</option>{GENDERS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></Field>
        <Field label="Malaysian state" error={errors.state}><select value={form.state} onChange={(event) => update("state", event.target.value)}><option value="">Select state</option>{STATES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <fieldset><legend>Current habits</legend><Field label="Physical activity" error={errors.physical_activity}><select value={form.lifestyle.physical_activity} onChange={(event) => update("lifestyle", { physical_activity: event.target.value })}><option value="">Select activity level</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></Field><Field label="Average sleep hours" error={errors.sleep_hours}><input type="number" min="0" max="24" step="0.5" value={form.lifestyle.sleep_hours} onChange={(event) => update("lifestyle", { sleep_hours: event.target.value })} placeholder="e.g. 7" /></Field><Toggle label="I currently smoke" value={form.lifestyle.smoker} onChange={(value) => update("lifestyle", { smoker: value })} /><Toggle label="I often choose sugary drinks or foods" value={form.lifestyle.diet_high_sugar} onChange={(value) => update("lifestyle", { diet_high_sugar: value })} /><Field label="Recent health screening" error={errors.recent_screening}><select value={form.lifestyle.recent_screening} onChange={(event) => update("lifestyle", { recent_screening: event.target.value })}><option value="">Select response</option><option value="yes">Yes, within the last year</option><option value="no">No</option><option value="unsure">Unsure</option></select></Field></fieldset>
        <fieldset><legend>Broad family history</legend><p className="small-note">Do not identify a relative or provide clinical details.</p><div className="chip-row">{FAMILY_HISTORY.map((item) => <button type="button" className={form.family_history.includes(item) ? "chip selected" : "chip"} key={item} onClick={() => toggleFamily(item)}>{item.replaceAll("_", " ")}</button>)}</div>{errors.family_history && <p className="field-error">{errors.family_history}</p>}</fieldset>
        {errors.form && <p className="field-error">{errors.form}</p>}
        <button className="primary-button full" disabled={loading}>{loading ? "Preparing your local report…" : "Generate priority insights"}</button>
      </form><Disclaimer />
    </main>
  );
}

function Field({ label, error, children }) { return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>; }
function Toggle({ label, value, onChange }) { return <label className="toggle"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }

function GeneralInsights({ overview, setOverview, setPage }) {
  const [state, setState] = useState(overview?.state || "Johor");
  useEffect(() => { fetch(`/api/overview?state=${encodeURIComponent(state)}`).then((response) => response.json()).then(setOverview); }, [state, setOverview]);
  const mortality = overview?.mortality || [];
  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">General content mode</p><h1>Malaysia in context</h1><p className="lead">Browse population-level data without creating a profile.</p></div><select className="state-select" value={state} onChange={(event) => setState(event.target.value)}><option>Johor</option><option>Selangor</option><option>Pulau Pinang</option><option>Sabah</option><option>Sarawak</option><option>W.P. Kuala Lumpur</option></select></div>
    <div className="chart-grid"><ChartCard title="2024 principal mortality context"><ResponsiveContainer width="100%" height={280}><BarChart data={mortality}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="cause_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={65} /><YAxis unit="%" /><Tooltip formatter={(value) => [`${value}%`, "Medically certified deaths"]} /><Bar dataKey="measure_value" fill="#0b7c72" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer><p className="chart-note">DOSM cause-of-death context only; it does not predict individual outcomes.</p></ChartCard>
      <ChartCard title={`Annual deaths recorded in ${state}`}><ResponsiveContainer width="100%" height={280}><LineChart data={overview?.annualDeaths || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip /><Line type="monotone" dataKey="death_count" stroke="#d06b3d" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer><p className="chart-note">Annual deaths by usual residence, sex and ethnicity; not cause-specific.</p></ChartCard></div>
    <div className="stat-row"><Stat label="Latest population" value={overview?.population ? `${Number(overview.population.population_thousands).toLocaleString()}k` : "—"} note={`${state}, overall population`} /><Stat label="Recent PeKaB40 activity" value={overview?.screenings?.reduce((sum, item) => sum + Number(item.screening_count), 0).toLocaleString() || "—"} note={`${state}, latest 14 displayed days`} /><Stat label="Data mode" value="Public" note="No profile is stored" /></div>
    <button className="primary-button" onClick={() => setPage("privacy")}>Start a private session</button><Disclaimer /></main>;
}
function ChartCard({ title, children }) { return <section className="chart-card"><h2>{title}</h2>{children}</section>; }
function Stat({ label, value, note }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }

function Report({ result, setPage, cloudEnabled }) {
  const [assistant, setAssistant] = useState(null);
  if (!result) return <main className="narrow-page"><h1>No report yet</h1><button className="primary-button" onClick={() => setPage("privacy")}>Start a session</button></main>;
  async function explain(indicator_id, kind) { const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicator_id, kind }) }); const data = await response.json(); setAssistant(data); }
  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">{cloudEnabled ? "Anonymous synced session report" : "Local session report"}</p><h1>Priority insights</h1><p className="lead">These are ordered areas for preventive attention based on your answers and the database rules.</p></div><button className="secondary-button" onClick={() => setPage("goals")}>Choose goals</button></div>
    <div className="profile-summary"><span>{result.profile.age_group}</span><span>{result.profile.gender.replaceAll("_", " ")}</span><span>{result.profile.state}</span><span>{cloudEnabled ? "Synced by anonymous session ID" : "Stored locally only"}</span></div>
    {result.prioritised_indicators.length === 0 ? <section className="empty-card"><h2>No indicator was prioritised</h2><p>Your current answers did not match an active rule. You can explore general information or clear this session.</p></section> : result.prioritised_indicators.map((indicator) => <IndicatorCard key={indicator.indicator_id} indicator={indicator} onExplain={explain} />)}
    {assistant && <section className="assistant-card"><div className="assistant-head"><h2>Explanation assistant</h2><button onClick={() => setAssistant(null)}>Close</button></div><p>{assistant.reply}</p><small>{assistant.source}</small><Disclaimer>{assistant.disclaimer}</Disclaimer></section>}
    <section className="recommendation-section"><div className="section-heading"><div><p className="eyebrow">Action plan</p><h2>Practical next steps</h2></div><button className="secondary-button" onClick={() => setPage("goals")}>Track a goal</button></div>{result.recommendations.map((item) => <article className="recommendation-card" key={item.recommendation_id}><span className="priority-tag">Priority {item.priority_position}</span><h3>{item.action_title}</h3><p>{item.action_description}</p><p className="why"><strong>Why:</strong> {item.explanation}</p><p className="first-step"><strong>First step:</strong> {item.first_step}</p></article>)}</section>
    <section className="report-sources"><h2>Sources used</h2>{result.sources.map((source) => <a key={source.source_id} href={source.source_url || "#"} target="_blank" rel="noreferrer"><strong>{source.dataset_name}</strong><span>{source.organisation} · {source.publication_year}</span></a>)}</section><Disclaimer />
  </main>;
}

function IndicatorCard({ indicator, onExplain }) {
  const ref = indicator.reference;
  return <article className="indicator-card"><div className="indicator-top"><div><span className="priority-number">{indicator.priority_position}</span><div className="indicator-title"><p className="eyebrow">Priority indicator</p><h2>{indicator.indicator_name}</h2></div></div><span className="priority-score">Priority {indicator.priority_score}</span></div><p>{indicator.explanation}</p><div className="contribution-list"><strong>Contributing answers</strong>{indicator.contributing_factors.map((item, index) => <span key={`${item.factor}-${index}`}>{item.factor.replaceAll("_", " ")}: {formatFactor(item.factor, item.value)}</span>)}</div>{ref && <div className="comparison-box"><div><strong>Malaysian reference</strong><span>{ref.reference_value}{ref.unit === "percent" ? "%" : ` ${ref.unit}`} · {ref.reference_year}</span></div><p>{ref.interpretation} This is a population reference, not an individual target.</p></div>}{indicator.mortality_context?.length > 0 && <div className="mortality-box"><strong>Population mortality context</strong>{indicator.mortality_context.map((item) => <span key={item.mortality_id}>{item.cause_name}: {item.measure_value}% ({item.age_group === "all" ? "Malaysia" : `DOSM age band ${item.age_group}`})</span>)}</div>}<div className="assistant-buttons"><button onClick={() => onExplain(indicator.indicator_id, "explain")}>Explain this</button><button onClick={() => onExplain(indicator.indicator_id, "why")}>Why does this matter?</button><button onClick={() => onExplain(indicator.indicator_id, "simpler")}>Simpler explanation</button></div></article>;
}

function Goals({ result, sessionId, cloudEnabled }) {
  const [goals, setGoals] = useState(() => readStorage(STORAGE.goals, []));
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const available = result?.recommendations || [];

  useEffect(() => {
    if (!cloudEnabled) return;
    fetch(`/api/goals?session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => { if (!response.ok) throw new Error(data.error); setGoals(data.goals || []); })
      .catch(() => setError("Cloud goals are temporarily unavailable."));
  }, [cloudEnabled, sessionId]);

  async function refreshCloudGoals() {
    const response = await fetch(`/api/goals?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setGoals(data.goals || []);
  }

  async function addGoals() {
    const ids = selected.filter((id) => !goals.some((goal) => goal.recommendation_id === id));
    setLoading(true); setError("");
    try {
      if (cloudEnabled) {
        await Promise.all(ids.map(async (recommendation_id) => {
          const response = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, recommendation_id }) });
          if (!response.ok) throw new Error("Could not save goal");
        }));
        await refreshCloudGoals();
      } else {
        const newGoals = available.filter((item) => ids.includes(item.recommendation_id)).map((item) => ({ recommendation_id: item.recommendation_id, title: item.action_title, progress: 0, complete: false, start_date: new Date().toISOString().slice(0, 10) }));
        const merged = [...goals, ...newGoals]; setGoals(merged); saveStorage(STORAGE.goals, merged);
      }
      setSelected([]);
    } catch { setError("The goal could not be saved. Please try again."); } finally { setLoading(false); }
  }

  async function updateGoal(id, patch) {
    setError("");
    if (cloudEnabled) {
      try {
        const response = await fetch(`/api/goals/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, ...patch }) });
        if (!response.ok) throw new Error("Could not update goal");
        await refreshCloudGoals();
      } catch { setError("The goal could not be updated. Please try again."); }
      return;
    }
    const next = goals.map((goal) => goal.recommendation_id === id ? { ...goal, ...patch } : goal); setGoals(next); saveStorage(STORAGE.goals, next);
  }

  async function clearGoals() {
    setError("");
    if (cloudEnabled) {
      try { await Promise.all(goals.map((goal) => fetch(`/api/goals/${encodeURIComponent(goal.recommendation_id)}?session_id=${encodeURIComponent(sessionId)}`, { method: "DELETE" }))); setGoals([]); }
      catch { setError("The goals could not be deleted. Please try again."); }
      return;
    }
    setGoals([]); localStorage.removeItem(STORAGE.goals);
  }

  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">{cloudEnabled ? "Cloud-synced tracking" : "Browser-only tracking"}</p><h1>My goals</h1><p className="lead">{cloudEnabled ? "Goals are saved through the API under your anonymous session ID." : "Goals stay in this browser during local development."}</p></div><button className="secondary-button" onClick={clearGoals}>Delete all goals</button></div>{error && <p className="field-error">{error}</p>}<section className="goal-picker"><h2>Add a recommendation as a goal</h2>{available.map((item) => <label key={item.recommendation_id} className="goal-option"><input type="checkbox" checked={selected.includes(item.recommendation_id)} onChange={() => setSelected((current) => current.includes(item.recommendation_id) ? current.filter((id) => id !== item.recommendation_id) : [...current, item.recommendation_id])} /><span>{item.action_title}</span></label>)}<button className="primary-button" disabled={!selected.length || loading} onClick={addGoals}>{loading ? "Saving…" : "Add selected goals"}</button></section><div className="goal-list">{goals.map((goal) => <article className="goal-card" key={goal.recommendation_id}><div><h3>{goal.title}</h3><small>Started {goal.start_date}</small></div><label>Progress <input type="range" min="0" max="100" value={goal.progress} onChange={(event) => updateGoal(goal.recommendation_id, { progress: Number(event.target.value), complete: Number(event.target.value) === 100 })} /></label><strong>{goal.complete ? "Complete" : `${goal.progress}%`}</strong><button className="text-button" onClick={() => updateGoal(goal.recommendation_id, { complete: !goal.complete, progress: goal.complete ? goal.progress : 100 })}>{goal.complete ? "Reopen" : "Mark complete"}</button></article>)}</div></main>;
}

function Sources({ overview }) { return <main className="content-page"><p className="eyebrow">Data provenance</p><h1>Sources and limitations</h1><p className="lead">Every displayed statistic keeps its dataset name and year. Read the source notes before interpreting a chart.</p><div className="source-grid">{(overview?.sources || []).map((source) => <article className="source-card" key={source.source_id}><span className="source-year">{source.publication_year || "—"}</span><h2>{source.dataset_name}</h2><p>{source.organisation}</p><p className="small-note">{source.notes}</p>{source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer">Open official source →</a>}</article>)}</div><section className="notice-card"><h2>Scope statement</h2><p>HealthPath Malaysia uses self-reported answers and aggregate population data. It does not predict individual mortality, life expectancy, diagnosis, treatment needs or personal health outcomes.</p></section><Disclaimer /></main>; }

function App() {
  const [page, setPage] = useState("home");
  const [sessionId, setSessionId] = useState(() => getSessionId());
  const [consent, setConsent] = useState(() => readStorage(STORAGE.consent, null));
  const [profile, setProfile] = useState(() => readStorage(STORAGE.profile, null));
  const [result, setResult] = useState(() => readStorage(STORAGE.result, null));
  const [overview, setOverview] = useState(null);
  const [backend, setBackend] = useState(null);
  useEffect(() => { fetch("/api/overview?state=Johor").then((response) => response.json()).then(setOverview).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/health").then((response) => response.json()).then(setBackend).catch(() => {}); }, []);
  const cloudEnabled = backend?.database === "PostgreSQL";
  useEffect(() => {
    if (!cloudEnabled) return;
    fetch(`/api/session/${encodeURIComponent(sessionId)}`).then((response) => response.json()).then((data) => {
      if (data.consent_accepted) setConsent("accepted");
      else if (consent === "accepted") { setConsent(null); localStorage.removeItem(STORAGE.consent); }
      if (data.profile) { setProfile(data.profile); saveStorage(STORAGE.profile, data.profile); }
      if (data.result) { setResult(data.result); saveStorage(STORAGE.result, data.result); }
    }).catch(() => {});
  }, [cloudEnabled, sessionId, consent]);
  function clearSession() {
    fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" }).catch(() => {});
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    const nextSessionId = getSessionId();
    setSessionId(nextSessionId); setConsent(null); setProfile(null); setResult(null); setPage("home");
  }
  let content = <Home setPage={setPage} />;
  if (page === "privacy") content = <Privacy consent={consent} setConsent={setConsent} setPage={setPage} sessionId={sessionId} cloudEnabled={cloudEnabled} />;
  if (page === "profile" && consent === "accepted") content = <Profile profile={profile} setProfile={setProfile} setResult={setResult} setPage={setPage} sessionId={sessionId} />;
  if (page === "profile" && consent !== "accepted") content = <Privacy consent={consent} setConsent={setConsent} setPage={setPage} sessionId={sessionId} cloudEnabled={cloudEnabled} />;
  if (page === "insights") content = <GeneralInsights overview={overview} setOverview={setOverview} setPage={setPage} />;
  if (page === "report") content = <Report result={result} setPage={setPage} cloudEnabled={cloudEnabled} />;
  if (page === "goals") content = <Goals result={result} sessionId={sessionId} cloudEnabled={cloudEnabled} />;
  if (page === "sources") content = <Sources overview={overview} />;
  return <><Header page={page} setPage={setPage} hasResult={Boolean(result)} clearSession={clearSession} />{content}<footer>HealthPath Malaysia · educational population context only</footer></>;
}

createRoot(document.getElementById("root")).render(<App />);
