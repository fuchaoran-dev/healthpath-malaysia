export default function Toggle({
  label,
  value,
  onChange,
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
      />

      <span>{label}</span>
    </label>
  );
}