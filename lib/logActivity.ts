import { getDatabase } from '@/lib/mongodb';
import { error } from '@/lib/logger';

export interface ActivityMeta {
  [key: string]: any;
}

export async function logActivity(userId: string, action: string, type?: string, message?: string, meta?: ActivityMeta) {
  try {
    const db = await getDatabase();
    const doc: any = {
      userId,
      action,
      type: type ?? null,
      message: message ?? null,
      meta: meta ?? null,
      createdAt: new Date(),
    };
    await db.collection('activity').insertOne(doc);
  } catch (e) {
    // do not throw — activity logging is best-effort
    error('Failed to log activity', e);
  }
}
