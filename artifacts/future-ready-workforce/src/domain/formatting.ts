const countFormatter = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 });

export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1_000) return countFormatter.format(value);

  const thousands = value / 1_000;
  const compactFormatter = new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: Math.abs(thousands) >= 1_000 ? 0 : 1,
    minimumFractionDigits: Math.abs(thousands) < 10 ? 1 : 0,
  });
  return `${compactFormatter.format(thousands)}K`;
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);
}
