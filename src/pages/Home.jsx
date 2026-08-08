import Disclaimer from "../components/Disclaimer";

export default function Home({
  setPage,
}) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            Population data made practical
          </p>

          <h1>
            Understand your next healthy
            step.
          </h1>

          <p className="hero-text">
            HealthPath Malaysia turns
            official Malaysian population
            statistics into plain-language,
            non-diagnostic preventive-health
            insights for adults aged 40–60.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() =>
                setPage("privacy")
              }
            >
              Start a private session{" "}
              <span>→</span>
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setPage("insights")
              }
            >
              Explore general data
            </button>
          </div>

          <Disclaimer />
        </div>

        <div className="hero-panel">
          <div className="hero-stat">
            <strong>4</strong>
            <span>
              official open-data themes
            </span>
          </div>

          <div className="hero-stat">
            <strong>0</strong>
            <span>
              accounts or permanent profiles
            </span>
          </div>

          <div className="hero-stat">
            <strong>100%</strong>
            <span>
              rule-based prioritisation
            </span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <span className="feature-icon">
            ◎
          </span>

          <h3>Privacy first</h3>

          <p>
            No name, NRIC, email or diagnosis
            is requested. A temporary
            anonymous session keeps the
            experience connected.
          </p>
        </article>

        <article>
          <span className="feature-icon">
            ↗
          </span>

          <h3>Official context</h3>

          <p>
            Compare displayed indicators with
            Malaysian reference values and
            population-level mortality
            context.
          </p>
        </article>

        <article>
          <span className="feature-icon">
            ✓
          </span>

          <h3>Small actions</h3>

          <p>
            Receive practical, ordered next
            steps instead of a medical risk
            prediction.
          </p>
        </article>
      </section>
    </main>
  );
}