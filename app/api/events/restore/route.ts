import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const deletedId = (body.deletedId || '').toString();
    if (!deletedId) return NextResponse.json({ error: 'Missing deletedId' }, { status: 400 });

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDatabase();
    const delColl = db.collection('events_deleted');
    const rec = await delColl.findOne({ _id: new ObjectId(deletedId) });
    if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = (session.user as any).role === 'admin';
    // only admin or the user who deleted can restore
    if (!isAdmin && rec.deletedById !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const coll = db.collection('events');
    // remove _id from rec before insert to let Mongo assign a new id
    const toInsert = { date: rec.date, title: rec.title, color: rec.color, createdById: rec.createdById, createdAt: rec.createdAt };
    const res = await coll.insertOne(toInsert);
    await delColl.deleteOne({ _id: new ObjectId(deletedId) });

    return NextResponse.json({ success: true, restoredId: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
