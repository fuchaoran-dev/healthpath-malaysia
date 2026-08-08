import { useState } from "react";

import Disclaimer from "../components/Disclaimer";
import IndicatorCard from "../components/IndicatorCard";

export default function Report({
  result,
  setPage,
  cloudEnabled,
}) {
  const [assistant, setAssistant] =
    useState(null);

  if (!result) {
    return (
      <main className="narrow-page">
        <h1>No report yet</h1>

        <button
          className="primary-button"
          onClick={() =>
            setPage("privacy")
          }
        >
          Start a session
        </button>
      </main>
    );
  }

  async function explain(
    indicator_id,
    kind
  ) {
    const response = await fetch(
      "/api/explain",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          indicator_id,
          kind,
        }),
      }
    );

    const data =
      await response.json();

    setAssistant(data);
  }

  return (
    <main className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {cloudEnabled
              ? "Anonymous synced session report"
              : "Local session report"}
          </p>

          <h1>Priority insights</h1>

          <p className="lead">
            These are ordered areas for
            preventive attention based on your
            answers and the database rules.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            setPage("goals")
          }
        >
          Choose goals
        </button>
      </div>

      <div className="profile-summary">
        <span>
          {result.profile.age_group}
        </span>

        <span>
          {result.profile.gender.replaceAll(
            "_",
            " "
          )}
        </span>

        <span>
          {result.profile.state}
        </span>

        <span>
          {cloudEnabled
            ? "Synced by anonymous session ID"
            : "Stored locally only"}
        </span>
      </div>

      {result.prioritised_indicators
        .length === 0 ? (
        <section className="empty-card">
          <h2>
            No indicator was prioritised
          </h2>

          <p>
            Your current answers did not match
            an active rule. You can explore
            general information or clear this
            session.
          </p>
        </section>
      ) : (
        result.prioritised_indicators.map(
          (indicator) => (
            <IndicatorCard
              key={
                indicator.indicator_id
              }
              indicator={indicator}
              onExplain={explain}
            />
          )
        )
      )}

      {assistant && (
        <section className="assistant-card">
          <div className="assistant-head">
            <h2>
              Explanation assistant
            </h2>

            <button
              onClick={() =>
                setAssistant(null)
              }
            >
              Close
            </button>
          </div>

          <p>{assistant.reply}</p>

          <small>
            {assistant.source}
          </small>

          <Disclaimer>
            {assistant.disclaimer}
          </Disclaimer>
        </section>
      )}

      <section className="recommendation-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Action plan
            </p>

            <h2>
              Practical next steps
            </h2>
          </div>

          <button
            className="secondary-button"
            onClick={() =>
              setPage("goals")
            }
          >
            Track a goal
          </button>
        </div>

        {result.recommendations.map(
          (item) => (
            <article
              className="recommendation-card"
              key={
                item.recommendation_id
              }
            >
              <span className="priority-tag">
                Priority{" "}
                {
                  item.priority_position
                }
              </span>

              <h3>
                {item.action_title}
              </h3>

              <p>
                {
                  item.action_description
                }
              </p>

              <p className="why">
                <strong>
                  Why:
                </strong>{" "}
                {item.explanation}
              </p>

              <p className="first-step">
                <strong>
                  First step:
                </strong>{" "}
                {item.first_step}
              </p>
            </article>
          )
        )}
      </section>

      <section className="report-sources">
        <h2>Sources used</h2>

        {result.sources.map(
          (source) => (
            <a
              key={source.source_id}
              href={
                source.source_url ||
                "#"
              }
              target="_blank"
              rel="noreferrer"
            >
              <strong>
                {
                  source.dataset_name
                }
              </strong>

              <span>
                {source.organisation}
                {" · "}
                {
                  source.publication_year
                }
              </span>
            </a>
          )
        )}
      </section>

      <Disclaimer />
    </main>
  );
}