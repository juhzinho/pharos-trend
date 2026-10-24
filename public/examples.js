export const EXAMPLES = [
  { id: "down3", count: "3", direction: "down" },
  { id: "down4", count: "4", direction: "down" },
  { id: "up3", count: "3", direction: "up" },
];

export function buttonLabel(row, lang) {
  if (lang === "pt") {
    const direction = row.direction === "down" ? "Queda" : "Alta";
    return `${direction}, ${row.count} leituras`;
  }
  const direction = row.direction === "down" ? "Down" : "Up";
  return `${direction}, ${row.count} checks`;
}
