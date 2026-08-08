import { useState } from "react";

import Disclaimer from "../components/Disclaimer";

import { STORAGE } from "../constants/options";
import { saveStorage } from "../utils/storage";

export default function Privacy({
  consent,
  setConsent,
  setPage,
  sessionId,
  cloudEnabled,
}) {
  const [checked, setChecked] =
    useState(
      consent === "accepted"
    );

  function accept() {
    if (!checked) return;

    saveStorage(
      STORAGE.consent,
      "accepted"
    );

    fetch("/api/session/consent", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        accepted: true,
      }),
    }).catch(() => {});

    setConsent("accepted");
    setPage("profile");
  }

  function decline() {
    localStorage.removeItem(
      STORAGE.profile
    );

    localStorage.removeItem(
      STORAGE.result
    );

    fetch("/api/session/consent", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        accepted: false,
      }),
    }).catch(() => {});

    saveStorage(
      STORAGE.consent,
      "declined"
    );

    setConsent("declined");
    setPage("insights");
  }

  return (
    <main className="narrow-page">
      <p className="eyebrow">
        Before you continue
      </p>

      <h1>Privacy notice</h1>

      <p className="lead">
        HealthPath asks only for broad,
        self-reported answers to create a
        temporary educational explanation.
      </p>

      <div className="notice-card">
        <h3>We collect</h3>

        <ul>
          <li>
            Age group, gender and Malaysian
            state
          </li>

          <li>
            Physical activity, sleep,
            smoking, diet and recent screening
            answers
          </li>

          <li>
            Broad family-history categories
            only
          </li>
        </ul>

        <h3>We do not collect</h3>

        <ul>
          <li>
            Name, email, phone, NRIC/MyKad or
            exact birthday
          </li>

          <li>
            Address, GPS location, diagnosis,
            medication or laboratory results
          </li>

          <li>
            Names or clinical details of
            relatives
          </li>
        </ul>

        <p className="small-note">
          {cloudEnabled
            ? "An anonymous session ID is used to sync your profile, report and goals to the project database. No account or direct identifier is required."
            : "In local development, profile, consent, goals and the generated report are stored in this browser's local storage."}{" "}
          Clear the session at any time to
          remove them.
        </p>
      </div>

      <label className="consent-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            setChecked(
              event.target.checked
            )
          }
        />

        <span>
          I have read this notice and consent
          to a temporary personalised session.
        </span>
      </label>

      <div className="button-row">
        <button
          className="primary-button"
          disabled={!checked}
          onClick={accept}
        >
          Accept and continue
        </button>

        <button
          className="secondary-button"
          onClick={decline}
        >
          Decline and browse general content
        </button>
      </div>

      <Disclaimer />
    </main>
  );
}