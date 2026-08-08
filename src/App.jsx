import { useEffect, useState } from "react";

import Header from "./components/Header";

import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Profile from "./pages/Profile";
import GeneralInsights from "./pages/GeneralInsights";
import Report from "./pages/Report";
import Goals from "./pages/Goals";
import Sources from "./pages/Sources";

import { STORAGE } from "./constants/options";
import {
  getSessionId,
  readStorage,
  saveStorage,
} from "./utils/storage";

export default function App() {
  const [page, setPage] = useState("home");

  const [sessionId, setSessionId] = useState(() =>
    getSessionId()
  );

  const [consent, setConsent] = useState(() =>
    readStorage(STORAGE.consent, null)
  );

  const [profile, setProfile] = useState(() =>
    readStorage(STORAGE.profile, null)
  );

  const [result, setResult] = useState(() =>
    readStorage(STORAGE.result, null)
  );

  const [overview, setOverview] = useState(null);
  const [backend, setBackend] = useState(null);

  useEffect(() => {
    fetch("/api/overview?state=Johor")
      .then((response) => response.json())
      .then(setOverview)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then(setBackend)
      .catch(() => {});
  }, []);

  const cloudEnabled =
    backend?.database === "PostgreSQL";

  useEffect(() => {
    if (!cloudEnabled) return;

    fetch(
      `/api/session/${encodeURIComponent(sessionId)}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.consent_accepted) {
          setConsent("accepted");
        } else if (consent === "accepted") {
          setConsent(null);
          localStorage.removeItem(STORAGE.consent);
        }

        if (data.profile) {
          setProfile(data.profile);

          saveStorage(
            STORAGE.profile,
            data.profile
          );
        }

        if (data.result) {
          setResult(data.result);

          saveStorage(
            STORAGE.result,
            data.result
          );
        }
      })
      .catch(() => {});
  }, [
    cloudEnabled,
    sessionId,
    consent,
  ]);

  function clearSession() {
    fetch(
      `/api/session/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      }
    ).catch(() => {});

    Object.values(STORAGE).forEach((key) =>
      localStorage.removeItem(key)
    );

    const nextSessionId = getSessionId();

    setSessionId(nextSessionId);
    setConsent(null);
    setProfile(null);
    setResult(null);
    setPage("home");
  }

  let content = (
    <Home setPage={setPage} />
  );

  if (page === "privacy") {
    content = (
      <Privacy
        consent={consent}
        setConsent={setConsent}
        setPage={setPage}
        sessionId={sessionId}
        cloudEnabled={cloudEnabled}
      />
    );
  }

  if (
    page === "profile" &&
    consent === "accepted"
  ) {
    content = (
      <Profile
        profile={profile}
        setProfile={setProfile}
        setResult={setResult}
        setPage={setPage}
        sessionId={sessionId}
      />
    );
  }

  if (
    page === "profile" &&
    consent !== "accepted"
  ) {
    content = (
      <Privacy
        consent={consent}
        setConsent={setConsent}
        setPage={setPage}
        sessionId={sessionId}
        cloudEnabled={cloudEnabled}
      />
    );
  }

  if (page === "insights") {
    content = (
      <GeneralInsights
        overview={overview}
        setOverview={setOverview}
        setPage={setPage}
      />
    );
  }

  if (page === "report") {
    content = (
      <Report
        result={result}
        setPage={setPage}
        cloudEnabled={cloudEnabled}
      />
    );
  }

  if (page === "goals") {
    content = (
      <Goals
        result={result}
        sessionId={sessionId}
        cloudEnabled={cloudEnabled}
      />
    );
  }

  if (page === "sources") {
    content = (
      <Sources overview={overview} />
    );
  }

  return (
    <>
      <Header
        page={page}
        setPage={setPage}
        hasResult={Boolean(result)}
        clearSession={clearSession}
      />

      {content}

      <footer>
        HealthPath Malaysia · educational
        population context only
      </footer>
    </>
  );
}