import Disclaimer from "../components/Disclaimer";

export default function Sources({
  overview,
}) {
  return (
    <main className="content-page">
      <p className="eyebrow">
        Data provenance
      </p>

      <h1>
        Sources and limitations
      </h1>

      <p className="lead">
        Every displayed statistic keeps its
        dataset name and year. Read the source
        notes before interpreting a chart.
      </p>

      <div className="source-grid">
        {(overview?.sources || []).map(
          (source) => (
            <article
              className="source-card"
              key={source.source_id}
            >
              <span className="source-year">
                {source.publication_year ||
                  "—"}
              </span>

              <h2>
                {source.dataset_name}
              </h2>

              <p>
                {source.organisation}
              </p>

              <p className="small-note">
                {source.notes}
              </p>

              {source.source_url && (
                <a
                  href={
                    source.source_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official source →
                </a>
              )}
            </article>
          )
        )}
      </div>

      <section className="notice-card">
        <h2>Scope statement</h2>

        <p>
          HealthPath Malaysia uses
          self-reported answers and aggregate
          population data. It does not predict
          individual mortality, life
          expectancy, diagnosis, treatment
          needs or personal health outcomes.
        </p>
      </section>

      <Disclaimer />
    </main>
  );
}