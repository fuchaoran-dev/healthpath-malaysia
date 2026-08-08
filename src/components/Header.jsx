export default function Header({
  page,
  setPage,
  hasResult,
  clearSession,
}) {
  return (
    <header className="site-header">
      <button
        className="brand"
        onClick={() =>
          setPage("home")
        }
        aria-label="HealthPath Malaysia home"
      >
        <span className="brand-mark">
          +
        </span>

        <span>
          HealthPath{" "}
          <em>Malaysia</em>
        </span>
      </button>

      <nav
        className="nav-links"
        aria-label="Main navigation"
      >
        <button
          className={
            page === "insights"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("insights")
          }
        >
          General insights
        </button>

        {hasResult && (
          <button
            className={
              page === "report"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("report")
            }
          >
            My report
          </button>
        )}

        <button
          className={
            page === "sources"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("sources")
          }
        >
          Data sources
        </button>

        {hasResult && (
          <button
            className={
              page === "goals"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("goals")
            }
          >
            Goals
          </button>
        )}
      </nav>

      <button
        className="clear-button"
        onClick={clearSession}
      >
        Clear session
      </button>
    </header>
  );
}