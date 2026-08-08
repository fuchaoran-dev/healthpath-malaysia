export function formatFactor(
  factor,
  value
) {
  if (factor === "family_history") {
    return Array.isArray(value)
      ? value
          .join(", ")
          .replaceAll("_", " ")
      : value;
  }

  if (
    factor === "smoker" ||
    factor === "diet_high_sugar"
  ) {
    return value ? "yes" : "no";
  }

  return String(value).replaceAll(
    "_",
    " "
  );
}