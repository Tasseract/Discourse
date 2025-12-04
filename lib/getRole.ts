import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { UserRole } from './roles';
import { getUserRole } from './getUserRole';
import { warn } from '@/lib/logger';

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve a user's role.
 * Order of lookup:
 * 1. session.user.role (if set by the auth provider)
 * 2. users collection: user.role or user.metadata?.role
 * 3. ADMIN_EMAILS environment variable (comma-separated) -> administrator
 * 4. fallback: 'member' for signed-in users, 'guest' for unauthenticated
 */
export async function resolveRoleFromSession(session: any): Promise<UserRole> {
  if (!session?.user) return UserRole.GUEST;

  // 1) session-provided role
  const sessionRole = (session as any)?.user?.role as string | undefined;
  if (sessionRole && Object.values(UserRole).includes(sessionRole as UserRole)) return sessionRole as UserRole;

  // 2) try to read role from DB via the shared helper
  try {
    const userId = session.user?.id;
    const email = session.user?.email;
    const dbRole = await getUserRole(userId, email);
    if (dbRole) return dbRole;
  } catch (e) {
    warn('resolveRoleFromSession: getUserRole failed', e);
  }

  // 3) ADMIN_EMAILS env fallback
  try {
  const adminList = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = (session.user?.email || '').toLowerCase();
  if (email && adminList.includes(email)) return UserRole.ADMINISTRATOR;
  } catch (e) {
    // ignore
  }

  // 4) default for signed-in users
  return UserRole.MEMBER;
}

export default resolveRoleFromSession;
