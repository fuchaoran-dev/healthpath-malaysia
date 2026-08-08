import { formatFactor } from "../utils/formatters";

export default function IndicatorCard({
  indicator,
  onExplain,
}) {
  const ref = indicator.reference;

  return (
    <article className="indicator-card">
      <div className="indicator-top">
        <div>
          <span className="priority-number">
            {
              indicator.priority_position
            }
          </span>

          <div className="indicator-title">
            <p className="eyebrow">
              Priority indicator
            </p>

            <h2>
              {indicator.indicator_name}
            </h2>
          </div>
        </div>

        <span className="priority-score">
          Priority{" "}
          {indicator.priority_score}
        </span>
      </div>

      <p>{indicator.explanation}</p>

      <div className="contribution-list">
        <strong>
          Contributing answers
        </strong>

        {indicator.contributing_factors.map(
          (item, index) => (
            <span
              key={`${item.factor}-${index}`}
            >
              {item.factor.replaceAll(
                "_",
                " "
              )}
              :{" "}
              {formatFactor(
                item.factor,
                item.value
              )}
            </span>
          )
        )}
      </div>

      {ref && (
        <div className="comparison-box">
          <div>
            <strong>
              Malaysian reference
            </strong>

            <span>
              {ref.reference_value}
              {ref.unit === "percent"
                ? "%"
                : ` ${ref.unit}`}
              {" · "}
              {ref.reference_year}
            </span>
          </div>

          <p>
            {ref.interpretation} This is a
            population reference, not an
            individual target.
          </p>
        </div>
      )}

      {indicator.mortality_context
        ?.length > 0 && (
        <div className="mortality-box">
          <strong>
            Population mortality context
          </strong>

          {indicator.mortality_context.map(
            (item) => (
              <span
                key={
                  item.mortality_id
                }
              >
                {item.cause_name}:{" "}
                {item.measure_value}% (
                {item.age_group === "all"
                  ? "Malaysia"
                  : `DOSM age band ${item.age_group}`}
                )
              </span>
            )
          )}
        </div>
      )}

      <div className="assistant-buttons">
        <button
          onClick={() =>
            onExplain(
              indicator.indicator_id,
              "explain"
            )
          }
        >
          Explain this
        </button>

        <button
          onClick={() =>
            onExplain(
              indicator.indicator_id,
              "why"
            )
          }
        >
          Why does this matter?
        </button>

        <button
          onClick={() =>
            onExplain(
              indicator.indicator_id,
              "simpler"
            )
          }
        >
          Simpler explanation
        </button>
      </div>
    </article>
  );
}