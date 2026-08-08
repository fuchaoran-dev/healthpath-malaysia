import { useState } from "react";

import Disclaimer from "../components/Disclaimer";
import Field from "../components/Field";
import Toggle from "../components/Toggle";

import {
  AGE_GROUPS,
  FAMILY_HISTORY,
  GENDERS,
  STATES,
  STORAGE,
} from "../constants/options";

import { saveStorage } from "../utils/storage";

export default function Profile({
  profile,
  setProfile,
  setResult,
  setPage,
  sessionId,
}) {
  const [form, setForm] = useState(
    profile || {
      age_group: "",
      gender: "",
      state: "",

      lifestyle: {
        physical_activity: "",
        sleep_hours: "",
        smoker: false,
        diet_high_sugar: false,
        recent_screening: "",
      },

      family_history: [],
    }
  );

  const [errors, setErrors] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  function update(path, value) {
    setForm((current) => {
      if (path === "lifestyle") {
        return {
          ...current,

          lifestyle: {
            ...current.lifestyle,
            ...value,
          },
        };
      }

      return {
        ...current,
        [path]: value,
      };
    });
  }

  function toggleFamily(value) {
    setForm((current) => {
      if (
        value === "none" ||
        value === "unsure"
      ) {
        return {
          ...current,

          family_history:
            current.family_history.includes(
              value
            )
              ? []
              : [value],
        };
      }

      const rest =
        current.family_history.filter(
          (item) =>
            item !== "none" &&
            item !== "unsure"
        );

      return {
        ...current,

        family_history:
          rest.includes(value)
            ? rest.filter(
                (item) =>
                  item !== value
              )
            : [...rest, value],
      };
    });
  }

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setErrors({});

    const response = await fetch(
      "/api/assess",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...form,
          session_id: sessionId,
        }),
      }
    );

    const data =
      await response.json();

    setLoading(false);

    if (!response.ok) {
      setErrors(
        data.fieldErrors || {
          form: data.error,
        }
      );

      return;
    }

    saveStorage(
      STORAGE.profile,
      form
    );

    saveStorage(
      STORAGE.result,
      data
    );

    setProfile(form);
    setResult(data);
    setPage("report");
  }

  return (
    <main className="narrow-page">
      <p className="eyebrow">
        Temporary health profile
      </p>

      <h1>
        Tell us about your current habits
      </h1>

      <p className="lead">
        These answers are used to order
        preventive indicators. They are not a
        diagnosis or a medical risk score.
      </p>

      <form
        onSubmit={submit}
        className="form-card"
      >
        <Field
          label="Age group"
          error={errors.age_group}
        >
          <select
            value={form.age_group}
            onChange={(event) =>
              update(
                "age_group",
                event.target.value
              )
            }
          >
            <option value="">
              Select age group
            </option>

            {AGE_GROUPS.map((item) => (
              <option key={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Gender"
          error={errors.gender}
        >
          <select
            value={form.gender}
            onChange={(event) =>
              update(
                "gender",
                event.target.value
              )
            }
          >
            <option value="">
              Select gender
            </option>

            {GENDERS.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item.replaceAll(
                  "_",
                  " "
                )}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Malaysian state"
          error={errors.state}
        >
          <select
            value={form.state}
            onChange={(event) =>
              update(
                "state",
                event.target.value
              )
            }
          >
            <option value="">
              Select state
            </option>

            {STATES.map((item) => (
              <option key={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <fieldset>
          <legend>
            Current habits
          </legend>

          <Field
            label="Physical activity"
            error={
              errors.physical_activity
            }
          >
            <select
              value={
                form.lifestyle
                  .physical_activity
              }
              onChange={(event) =>
                update("lifestyle", {
                  physical_activity:
                    event.target.value,
                })
              }
            >
              <option value="">
                Select activity level
              </option>

              <option value="low">
                Low
              </option>

              <option value="moderate">
                Moderate
              </option>

              <option value="high">
                High
              </option>
            </select>
          </Field>

          <Field
            label="Average sleep hours"
            error={errors.sleep_hours}
          >
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={
                form.lifestyle
                  .sleep_hours
              }
              onChange={(event) =>
                update("lifestyle", {
                  sleep_hours:
                    event.target.value,
                })
              }
              placeholder="e.g. 7"
            />
          </Field>

          <Toggle
            label="I currently smoke"
            value={
              form.lifestyle.smoker
            }
            onChange={(value) =>
              update("lifestyle", {
                smoker: value,
              })
            }
          />

          <Toggle
            label="I often choose sugary drinks or foods"
            value={
              form.lifestyle
                .diet_high_sugar
            }
            onChange={(value) =>
              update("lifestyle", {
                diet_high_sugar:
                  value,
              })
            }
          />

          <Field
            label="Recent health screening"
            error={
              errors.recent_screening
            }
          >
            <select
              value={
                form.lifestyle
                  .recent_screening
              }
              onChange={(event) =>
                update("lifestyle", {
                  recent_screening:
                    event.target.value,
                })
              }
            >
              <option value="">
                Select response
              </option>

              <option value="yes">
                Yes, within the last year
              </option>

              <option value="no">
                No
              </option>

              <option value="unsure">
                Unsure
              </option>
            </select>
          </Field>
        </fieldset>

        <fieldset>
          <legend>
            Broad family history
          </legend>

          <p className="small-note">
            Do not identify a relative or
            provide clinical details.
          </p>

          <div className="chip-row">
            {FAMILY_HISTORY.map(
              (item) => (
                <button
                  type="button"
                  className={
                    form.family_history.includes(
                      item
                    )
                      ? "chip selected"
                      : "chip"
                  }
                  key={item}
                  onClick={() =>
                    toggleFamily(item)
                  }
                >
                  {item.replaceAll(
                    "_",
                    " "
                  )}
                </button>
              )
            )}
          </div>

          {errors.family_history && (
            <p className="field-error">
              {
                errors.family_history
              }
            </p>
          )}
        </fieldset>

        {errors.form && (
          <p className="field-error">
            {errors.form}
          </p>
        )}

        <button
          className="primary-button full"
          disabled={loading}
        >
          {loading
            ? "Preparing your local report…"
            : "Generate priority insights"}
        </button>
      </form>

      <Disclaimer />
    </main>
  );
}