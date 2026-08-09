import { useRef, useState } from "react";

import AssistantDock from "../components/AssistantDock";
import Disclaimer from "../components/Disclaimer";
import IndicatorCard from "../components/IndicatorCard";

import {
  DECLINE_REPLY,
  EXPLAIN_DISCLAIMERS,
  NO_MATCH_REPLY,
  checkOutOfScope,
  resolveQuestion,
} from "../explain-safety.mjs";

const KIND_PROMPTS = {
  explain: "Explain",
  why: "Why does this matter",
  simpler: "Simpler explanation",
};

export default function Report({
  result,
  setPage,
  sessionId,
  cloudEnabled,
}) {
  const [assistantOpen, setAssistantOpen] =
    useState(false);

  const [thread, setThread] = useState(
    []
  );

  const [
    assistantLoading,
    setAssistantLoading,
  ] = useState(false);

  const [
    assistantError,
    setAssistantError,
  ] = useState(null);

  const messageId = useRef(0);

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

  function pushMessage(message) {
    messageId.current += 1;

    setThread((current) => [
      ...current,
      {
        id: messageId.current,
        ...message,
      },
    ]);
  }

  async function explain(
    target_type,
    target_id,
    kind,
    label
  ) {
    if (assistantLoading) return;

    setAssistantOpen(true);
    setAssistantError(null);
    setAssistantLoading(true);

    if (label) {
      pushMessage({
        role: "user",
        text: `${KIND_PROMPTS[kind]}: ${label}`,
      });
    }

    try {
      const response = await fetch(
        "/api/explain",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            target_type,
            target_id,
            kind,
            age_group:
              result.profile.age_group,
            session_id: sessionId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setAssistantError(
          data.error ||
            "That explanation is not available."
        );

        return;
      }

      pushMessage({
        role: "assistant",
        text: data.reply,
        source: data.source,
        // The pinned notice already says AI-generated; only flag a reply that
        // was not, so the disclosure stays accurate per message.
        note:
          data.mode === "generated"
            ? null
            : data.disclaimer,
      });
    } catch {
      setAssistantError(
        "The explanation could not be loaded. Please try again."
      );
    } finally {
      setAssistantLoading(false);
    }
  }

  // The typed question is matched against this report in the browser and is
  // never sent to our server or to any third party. It is kept in the thread
  // for display only — each request to /api/explain is single-shot.
  function ask(text) {
    setAssistantError(null);

    pushMessage({
      role: "user",
      text,
    });

    if (checkOutOfScope(text)) {
      pushMessage({
        role: "assistant",
        text: DECLINE_REPLY,
        note: EXPLAIN_DISCLAIMERS.declined,
      });

      return;
    }

    const target = resolveQuestion(
      text,
      result
    );

    if (!target) {
      pushMessage({
        role: "assistant",
        text: NO_MATCH_REPLY,
        note: EXPLAIN_DISCLAIMERS.declined,
      });

      return;
    }

    explain(
      target.target_type,
      target.target_id,
      target.kind
    );
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
                {" · Addresses "}
                {
                  item.indicator_name
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

              <button
                className="text-button"
                onClick={() =>
                  explain(
                    "recommendation",
                    item.recommendation_id,
                    "explain",
                    item.action_title
                  )
                }
              >
                Explain this action
              </button>
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

      <AssistantDock
        open={assistantOpen}
        thread={thread}
        loading={assistantLoading}
        error={assistantError}
        onOpen={() =>
          setAssistantOpen(true)
        }
        onClose={() =>
          setAssistantOpen(false)
        }
        onAsk={ask}
      />
    </main>
  );
}