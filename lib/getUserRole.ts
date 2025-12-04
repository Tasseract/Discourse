import { UserRole } from './roles';
import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { debug, info, warn } from '@/lib/logger';

/**
 * Try to read the user's role from the database.
 * Tries both 'users' and 'user' collections to be resilient to naming.
 */
export async function getUserRole(userId: string, email?: string): Promise<UserRole | null> {
  if (!userId && !email) {
    debug('getUserRole - No userId or email provided');
    return null;
  }

  const db = await getDatabase();
  debug('getUserRole - Using database:', db.databaseName);

  const collectionsToTry = ['users', 'user'];

  // Try lookup by id first
  if (userId) {
    for (const col of collectionsToTry) {
      try {
        const colRef = db.collection(col);
        let query: any = {};
        try {
          query = { _id: new ObjectId(userId) };
        } catch (e) {
          query = { _id: userId };
        }
        const user = await colRef.findOne(query, { projection: { role: 1, name: 1, email: 1, createdAt: 1, updatedAt: 1 } });
        debug(`getUserRole - looked in ${col} by id -> found=${!!user}`);
        if (user) {
          const role = user.role;
          if (!role) {
            // If no role, optionally set default (but don't mutate DB automatically here)
            debug('getUserRole - user has no role');
            return UserRole.MEMBER;
          }
          if (!Object.values(UserRole).includes(role)) {
            warn('getUserRole - invalid role value in DB:', role);
            return null;
          }
          return role as UserRole;
        }
      } catch (err) {
        warn('getUserRole - lookup error', err);
      }
    }
  }

  // Fallback: try lookup by email if provided
  if (email) {
    for (const col of collectionsToTry) {
      try {
        const colRef = db.collection(col);
        const user = await colRef.findOne({ email: { $regex: `^${String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, { projection: { role: 1, name: 1, email: 1 } });
        debug(`getUserRole - looked in ${col} by email -> found=${!!user}`);
        if (user) {
          const role = user.role;
          if (!role) return UserRole.MEMBER;
          if (!Object.values(UserRole).includes(role)) return null;
          return role as UserRole;
        }
      } catch (err) {
        warn('getUserRole - lookup by email error', err);
      }
    }
  }

  return null;
}

export default getUserRole;
