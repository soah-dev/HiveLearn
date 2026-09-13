import prisma from './prisma';

/**
 * Per-user daily caps on Gemini generation calls, enforced by counting
 * successful `AiUsage` rows created since the start of the current UTC day.
 * Override with AI_DAILY_LIMIT_PARENT / AI_DAILY_LIMIT_CHILD.
 */
const DEFAULT_PARENT_LIMIT = 25;
const DEFAULT_CHILD_LIMIT = 25;

function readLimit(envName: string, fallback: number): number {
  const raw = process.env[envName];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function dailyGenerationLimit(role: string | null): number {
  return role === 'child'
    ? readLimit('AI_DAILY_LIMIT_CHILD', DEFAULT_CHILD_LIMIT)
    : readLimit('AI_DAILY_LIMIT_PARENT', DEFAULT_PARENT_LIMIT);
}

export async function checkGenerationQuota(userId: string, role: string | null): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limit = dailyGenerationLimit(role);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const used = await prisma.aiUsage.count({
    where: { userId, type: 'generation', createdAt: { gte: startOfDay } },
  });

  return { allowed: used < limit, used, limit };
}

export function quotaExceededMessage(limit: number): string {
  return `You've reached the daily limit of ${limit} generations. Reach out to support to increase your quota, or try again tomorrow.`;
}
