export default function Disclaimer({
  children,
}) {
  return (
    <p className="disclaimer">
      {children ||
        "This information is educational and based on population-level Malaysian data. It does not predict individual outcomes and does not replace professional medical advice."}
    </p>
  );
}