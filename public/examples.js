export const EXAMPLES = [
  { id: "down3", count: "3", direction: "down", minutes: "0" },
  { id: "down4", count: "4", direction: "down", minutes: "0" },
  { id: "up3", count: "3", direction: "up", minutes: "0" },
  { id: "down3h", count: "3", direction: "down", minutes: "120" },
];

export function buttonLabel(row, lang) {
  if (lang === "pt") {
    const direction = row.direction === "down" ? "Queda" : "Alta";
    return `${direction}, ${row.count} leituras, ${row.minutes} min`;
  }
  const direction = row.direction === "down" ? "Down" : "Up";
  return `${direction}, ${row.count} checks, ${row.minutes} min`;
}
