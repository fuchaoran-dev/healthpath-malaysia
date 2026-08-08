import {
  useEffect,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChartCard from "../components/ChartCard";
import Disclaimer from "../components/Disclaimer";
import Stat from "../components/Stat";

export default function GeneralInsights({
  overview,
  setOverview,
  setPage,
}) {
  const [state, setState] =
    useState(
      overview?.state || "Johor"
    );

  useEffect(() => {
    fetch(
      `/api/overview?state=${encodeURIComponent(
        state
      )}`
    )
      .then((response) =>
        response.json()
      )
      .then(setOverview);
  }, [state, setOverview]);

  const mortality =
    overview?.mortality || [];

  return (
    <main className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            General content mode
          </p>

          <h1>
            Malaysia in context
          </h1>

          <p className="lead">
            Browse population-level data
            without creating a profile.
          </p>
        </div>

        <select
          className="state-select"
          value={state}
          onChange={(event) =>
            setState(
              event.target.value
            )
          }
        >
          <option>Johor</option>
          <option>Selangor</option>
          <option>Pulau Pinang</option>
          <option>Sabah</option>
          <option>Sarawak</option>
          <option>
            W.P. Kuala Lumpur
          </option>
        </select>
      </div>

      <div className="chart-grid">
        <ChartCard title="2024 principal mortality context">
          <ResponsiveContainer
            width="100%"
            height={280}
          >
            <BarChart
              data={mortality}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="cause_name"
                tick={{
                  fontSize: 11,
                }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={65}
              />

              <YAxis unit="%" />

              <Tooltip
                formatter={(value) => [
                  `${value}%`,
                  "Medically certified deaths",
                ]}
              />

              <Bar
                dataKey="measure_value"
                fill="#0b7c72"
                radius={[
                  8,
                  8,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>

          <p className="chart-note">
            DOSM cause-of-death context only;
            it does not predict individual
            outcomes.
          </p>
        </ChartCard>

        <ChartCard
          title={`Annual deaths recorded in ${state}`}
        >
          <ResponsiveContainer
            width="100%"
            height={280}
          >
            <LineChart
              data={
                overview?.annualDeaths ||
                []
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis dataKey="year" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="death_count"
                stroke="#d06b3d"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="chart-note">
            Annual deaths by usual residence,
            sex and ethnicity; not
            cause-specific.
          </p>
        </ChartCard>
      </div>

      <div className="stat-row">
        <Stat
          label="Latest population"
          value={
            overview?.population
              ? `${Number(
                  overview.population
                    .population_thousands
                ).toLocaleString()}k`
              : "—"
          }
          note={`${state}, overall population`}
        />

        <Stat
          label="Recent PeKaB40 activity"
          value={
            overview?.screenings
              ?.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.screening_count
                  ),
                0
              )
              .toLocaleString() ||
            "—"
          }
          note={`${state}, latest 14 displayed days`}
        />

        <Stat
          label="Data mode"
          value="Public"
          note="No profile is stored"
        />
      </div>

      <button
        className="primary-button"
        onClick={() =>
          setPage("privacy")
        }
      >
        Start a private session
      </button>

      <Disclaimer />
    </main>
  );
}