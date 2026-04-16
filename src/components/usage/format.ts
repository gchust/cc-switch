export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function fmtInt(
  value: unknown,
  locale?: string,
  fallback: string = "--",
): string {
  const num = parseFiniteNumber(value);
  if (num == null) return fallback;
  return new Intl.NumberFormat(locale).format(Math.trunc(num));
}

export function fmtUsd(
  value: unknown,
  digits: number,
  fallback: string = "--",
): string {
  const num = parseFiniteNumber(value);
  if (num == null) return fallback;
  return `$${num.toFixed(digits)}`;
}

export function fmtCompactNumber(
  value: unknown,
  fallback: string = "--",
): string {
  const num = parseFiniteNumber(value);
  if (num == null) return fallback;

  const abs = Math.abs(num);
  const truncated = Math.trunc(num);
  if (abs < 1000) {
    return String(truncated);
  }

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "k" },
  ] as const;
  const unit = units.find(({ threshold }) => abs >= threshold);
  if (!unit) {
    return String(truncated);
  }

  const scaled = num / unit.threshold;
  const digits = Math.abs(scaled) >= 100 ? 0 : 1;
  const formatted = scaled.toFixed(digits).replace(/\.0$/, "");
  return `${formatted}${unit.suffix}`;
}

export function getLocaleFromLanguage(language: string): string {
  if (!language) return "en-US";
  if (language.startsWith("zh")) return "zh-CN";
  if (language.startsWith("ja")) return "ja-JP";
  return "en-US";
}
