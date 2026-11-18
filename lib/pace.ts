// Weekly-limit pace: is usage ahead of an even spread across the 7-day window?

export const WEEK_HOURS = 7 * 24;
/** Percent of the weekly limit an even pace uses per hour (PpH = 100% / 168h). */
export const PERCENT_PER_HOUR = 100 / WEEK_HOURS;
/** At or below this share of the even pace is blue (well under pace). */
const PACE_LOW = 0.5;
/** Up to this much over the even pace is yellow; beyond it is red. */
const PACE_TOLERANCE = 0.1;

/**
 * Compares real usage (RU) with ideal usage (IU = hours passed × PpH):
 * blue when RU <= IU × 0.5, green when RU <= IU, yellow when RU <= IU × 1.1,
 * red above that.
 * Grey when the reset time is unknown, so the window start can't be placed.
 */
export function paceColor(usedPercent: number, resetsAtMs: number, nowMs: number): string {
  if (Number.isNaN(resetsAtMs)) return "text-muted-foreground";
  const windowStartMs = resetsAtMs - WEEK_HOURS * 3_600_000;
  const hoursPassed = Math.min(WEEK_HOURS, Math.max(0, (nowMs - windowStartMs) / 3_600_000));
  const idealUsage = hoursPassed * PERCENT_PER_HOUR;
  if (usedPercent <= idealUsage * PACE_LOW) return "text-blue-500";
  if (usedPercent <= idealUsage) return "text-green-500";
  if (usedPercent <= idealUsage * (1 + PACE_TOLERANCE)) return "text-yellow-500";
  return "text-red-500";
}
