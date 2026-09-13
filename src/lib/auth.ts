import { NextRequest } from 'next/server';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin';
import prisma from './prisma';

/**
 * Verify the bearer token and return both the Prisma user and the decoded
 * Firebase claims (needed for e.g. `email_verified`).
 */
export async function getAuthContext(req: NextRequest): Promise<{
  user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  claims: DecodedIdToken;
} | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const claims = await adminAuth.verifyIdToken(token);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: claims.uid },
    });
    return { user, claims };
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest) {
  const ctx = await getAuthContext(req);
  return ctx?.user ?? null;
}

/** Admins are configured by email in ADMIN_EMAILS (comma-separated). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Resolve the request's user and require them to be an admin.
 * Returns `{ user }` on success, or `{ error }` — a ready-to-return 401/403 response.
 */
export async function requireAdmin(req: NextRequest): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>; error?: undefined }
  | { user?: undefined; error: Response }
> {
  const user = await getAuthUser(req);
  if (!user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isAdminEmail(user.email)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

/**
 * Returns the active ParentChild link between a parent and a child, or null
 * when the parent is not linked to that child. Use this before exposing or
 * mutating any child-scoped data on behalf of a parent.
 */
export async function getLinkedChild(parentId: string, childId: string | null | undefined) {
  if (!childId) return null;
  return prisma.parentChild.findFirst({
    where: { parentId, childId, status: 'active' },
  });
}
