/**
 * Server-side enforcement of timed assignments and SAT modules.
 * The client auto-submits at zero; the grace period absorbs network latency
 * and a slow device, but stops a stalled browser tab from buying unlimited time.
 */
export const TIME_LIMIT_GRACE_MS = 2 * 60 * 1000;

export function isPastTimeLimit(
  startedAt: Date | null | undefined,
  timeLimitMin: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!startedAt || !timeLimitMin) return false;
  const deadline = startedAt.getTime() + timeLimitMin * 60_000 + TIME_LIMIT_GRACE_MS;
  return now.getTime() > deadline;
}
