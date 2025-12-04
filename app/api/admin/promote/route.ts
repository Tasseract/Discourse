import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getDatabase } from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body?.userId === 'string' ? body.userId : null;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = await getDatabase();
    const collectionsToTry = ['users', 'user'];
    let updated = false;

    for (const colName of collectionsToTry) {
      try {
        const col = db.collection(colName as any);
        // attempt ObjectId match first
        try {
          const { ObjectId } = await import('mongodb');
          const objId = new ObjectId(userId);
          const res = await col.updateOne({ _id: objId }, { $set: { role: 'administrator' } } as any);
          if (res.matchedCount > 0) { updated = true; break; }
        } catch (e) {
          // not an ObjectId or failed - try fallback
          const res = await col.updateOne({ id: userId }, { $set: { role: 'administrator' } } as any);
          if (res.matchedCount > 0) { updated = true; break; }
        }
      } catch (e) {
        // ignore and try next collection
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // log activity: admin promoted a user
    try {
      const approverId = session?.user?.id || 'system';
      const { logActivity } = await import('@/lib/logActivity');
      await logActivity(approverId, 'admin.promoted', 'admin', `Promoted ${userId} to administrator`, { promotedUserId: userId, approverId });
    } catch (e) {
      // best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
