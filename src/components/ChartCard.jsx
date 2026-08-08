export default function ChartCard({
  title,
  children,
}) {
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}