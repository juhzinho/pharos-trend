export function formatUnits(value, decimals, places = decimals) {
  const raw = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = (raw % base).toString().padStart(decimals, "0").slice(0, places);
  const text = places === 0 ? whole.toString() : `${whole}.${frac}`;
  return value < 0n ? `-${text}` : text;
}

export function hex(value) {
  return `0x${BigInt(value).toString(16)}`;
}
