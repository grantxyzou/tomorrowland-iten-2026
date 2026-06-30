// Single source of truth for the departure countdown shown in both tab headers.
// Previously this was implemented 3× with divergent casing ("14 DAYS" vs
// "14 days"); both header strips now call this so they read identically.

// Days until `dateStr` (YYYY-MM-DD or any Date-parseable). Inclusive ceil so the
// departure day itself reads 0. Returns null for a missing/invalid date.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const dep = new Date(dateStr);
  if (Number.isNaN(dep.getTime())) return null;
  dep.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dep - today) / 86_400_000);
}

// Uppercase label for the identity strip: "N DAYS" / "1 DAY" / "TODAY" /
// "UNDERWAY" (departure passed). null when there's no date to show.
export function countdownLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d == null) return null;
  if (d > 0) return `${d} ${d === 1 ? 'DAY' : 'DAYS'}`;
  return d === 0 ? 'TODAY' : 'UNDERWAY';
}
