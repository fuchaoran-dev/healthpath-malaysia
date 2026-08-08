import {
  useEffect,
  useState,
} from "react";

import { STORAGE } from "../constants/options";

import {
  readStorage,
  saveStorage,
} from "../utils/storage";

export default function Goals({
  result,
  sessionId,
  cloudEnabled,
}) {
  const [goals, setGoals] =
    useState(() =>
      readStorage(
        STORAGE.goals,
        []
      )
    );

  const [selected, setSelected] =
    useState([]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const available =
    result?.recommendations || [];

  useEffect(() => {
    if (!cloudEnabled) return;

    fetch(
      `/api/goals?session_id=${encodeURIComponent(
        sessionId
      )}`
    )
      .then((response) =>
        response
          .json()
          .then((data) => ({
            response,
            data,
          }))
      )
      .then(
        ({
          response,
          data,
        }) => {
          if (!response.ok) {
            throw new Error(
              data.error
            );
          }

          setGoals(
            data.goals || []
          );
        }
      )
      .catch(() =>
        setError(
          "Cloud goals are temporarily unavailable."
        )
      );
  }, [
    cloudEnabled,
    sessionId,
  ]);

  async function refreshCloudGoals() {
    const response = await fetch(
      `/api/goals?session_id=${encodeURIComponent(
        sessionId
      )}`
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error
      );
    }

    setGoals(data.goals || []);
  }

  async function addGoals() {
    const ids = selected.filter(
      (id) =>
        !goals.some(
          (goal) =>
            goal.recommendation_id ===
            id
        )
    );

    setLoading(true);
    setError("");

    try {
      if (cloudEnabled) {
        await Promise.all(
          ids.map(
            async (
              recommendation_id
            ) => {
              const response =
                await fetch(
                  "/api/goals",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify(
                        {
                          session_id:
                            sessionId,

                          recommendation_id,
                        }
                      ),
                  }
                );

              if (
                !response.ok
              ) {
                throw new Error(
                  "Could not save goal"
                );
              }
            }
          )
        );

        await refreshCloudGoals();
      } else {
        const newGoals =
          available
            .filter((item) =>
              ids.includes(
                item.recommendation_id
              )
            )
            .map((item) => ({
              recommendation_id:
                item.recommendation_id,

              title:
                item.action_title,

              progress: 0,

              complete: false,

              start_date:
                new Date()
                  .toISOString()
                  .slice(0, 10),
            }));

        const merged = [
          ...goals,
          ...newGoals,
        ];

        setGoals(merged);

        saveStorage(
          STORAGE.goals,
          merged
        );
      }

      setSelected([]);
    } catch {
      setError(
        "The goal could not be saved. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateGoal(
    id,
    patch
  ) {
    setError("");

    if (cloudEnabled) {
      try {
        const response =
          await fetch(
            `/api/goals/${encodeURIComponent(
              id
            )}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  session_id:
                    sessionId,

                  ...patch,
                }),
            }
          );

        if (!response.ok) {
          throw new Error(
            "Could not update goal"
          );
        }

        await refreshCloudGoals();
      } catch {
        setError(
          "The goal could not be updated. Please try again."
        );
      }

      return;
    }

    const next = goals.map(
      (goal) =>
        goal.recommendation_id ===
        id
          ? {
              ...goal,
              ...patch,
            }
          : goal
    );

    setGoals(next);

    saveStorage(
      STORAGE.goals,
      next
    );
  }

  async function clearGoals() {
    setError("");

    if (cloudEnabled) {
      try {
        await Promise.all(
          goals.map((goal) =>
            fetch(
              `/api/goals/${encodeURIComponent(
                goal.recommendation_id
              )}?session_id=${encodeURIComponent(
                sessionId
              )}`,
              {
                method:
                  "DELETE",
              }
            )
          )
        );

        setGoals([]);
      } catch {
        setError(
          "The goals could not be deleted. Please try again."
        );
      }

      return;
    }

    setGoals([]);

    localStorage.removeItem(
      STORAGE.goals
    );
  }

  return (
    <main className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {cloudEnabled
              ? "Cloud-synced tracking"
              : "Browser-only tracking"}
          </p>

          <h1>My goals</h1>

          <p className="lead">
            {cloudEnabled
              ? "Goals are saved through the API under your anonymous session ID."
              : "Goals stay in this browser during local development."}
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={clearGoals}
        >
          Delete all goals
        </button>
      </div>

      {error && (
        <p className="field-error">
          {error}
        </p>
      )}

      <section className="goal-picker">
        <h2>
          Add a recommendation as a goal
        </h2>

        {available.map(
          (item) => (
            <label
              key={
                item.recommendation_id
              }
              className="goal-option"
            >
              <input
                type="checkbox"
                checked={selected.includes(
                  item.recommendation_id
                )}
                onChange={() =>
                  setSelected(
                    (current) =>
                      current.includes(
                        item.recommendation_id
                      )
                        ? current.filter(
                            (id) =>
                              id !==
                              item.recommendation_id
                          )
                        : [
                            ...current,
                            item.recommendation_id,
                          ]
                  )
                }
              />

              <span>
                {item.action_title}
              </span>
            </label>
          )
        )}

        <button
          className="primary-button"
          disabled={
            !selected.length ||
            loading
          }
          onClick={addGoals}
        >
          {loading
            ? "Saving…"
            : "Add selected goals"}
        </button>
      </section>

      <div className="goal-list">
        {goals.map((goal) => (
          <article
            className="goal-card"
            key={
              goal.recommendation_id
            }
          >
            <div>
              <h3>
                {goal.title}
              </h3>

              <small>
                Started{" "}
                {goal.start_date}
              </small>
            </div>

            <label>
              Progress

              <input
                type="range"
                min="0"
                max="100"
                value={
                  goal.progress
                }
                onChange={(event) =>
                  updateGoal(
                    goal.recommendation_id,
                    {
                      progress:
                        Number(
                          event
                            .target
                            .value
                        ),

                      complete:
                        Number(
                          event
                            .target
                            .value
                        ) === 100,
                    }
                  )
                }
              />
            </label>

            <strong>
              {goal.complete
                ? "Complete"
                : `${goal.progress}%`}
            </strong>

            <button
              className="text-button"
              onClick={() =>
                updateGoal(
                  goal.recommendation_id,
                  {
                    complete:
                      !goal.complete,

                    progress:
                      goal.complete
                        ? goal.progress
                        : 100,
                  }
                )
              }
            >
              {goal.complete
                ? "Reopen"
                : "Mark complete"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}