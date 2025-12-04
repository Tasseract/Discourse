import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as groupsLib from '@/lib/groups';
import { ObjectId } from 'mongodb';

// GET /api/events?month=YYYY-MM -> returns events for that month
// POST /api/events { date: 'YYYY-MM-DD', title, color } -> create event
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const db = await getDatabase();
    const coll = db.collection('events');
    if (!month) {
      // return a small recent set
      const list = await coll.find({}).sort({ date: 1 }).limit(200).toArray();
      return NextResponse.json((list || []).map((e: any) => ({ ...e, _id: e._id.toString() })));
    }
    // month expected format YYYY-MM
    const [y, m] = (month || '').split('-');
    if (!y || !m) return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    const start = new Date(Number(y), Number(m) - 1, 1);
    const end = new Date(Number(y), Number(m), 1);
    const list = await coll.find({ date: { $gte: start.toISOString().slice(0,10), $lt: end.toISOString().slice(0,10) } }).toArray();
    return NextResponse.json((list || []).map((e: any) => ({ ...e, _id: e._id.toString() })));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDatabase();

    // Prefer checking membership using the shared helper so server and client use the
    // same membership query semantics (handles different member shapes).
    try {
      const userGroups = await groupsLib.getUserGroups(session.user.id);
      const isCouncil = Array.isArray(userGroups) && userGroups.some((g: any) => {
        const slug = (g.slug || '').toString().toLowerCase();
        const name = (g.name || '').toString().toLowerCase();
        if (slug === 'student-councils' || slug === 'student-council') return true;
        if (name.includes('student') && name.includes('council')) return true;
        return false;
      });
      if (!isCouncil) {
        console.warn('events.POST - membership check failed', { userId: session.user.id, userGroups });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      console.warn('events.POST - membership check error', { userId: session.user.id, error: (e as Error).message });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const date = (body.date || '').toString();
    const title = (body.title || '').toString();
    const color = (body.color || '#2dd4bf').toString();
    if (!date || !title) return NextResponse.json({ error: 'Missing date or title' }, { status: 400 });

    const coll = db.collection('events');
    const doc: any = { date, title, color, createdById: session.user.id, createdAt: new Date() };
    const res = await coll.insertOne(doc);
    return NextResponse.json({ success: true, id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDatabase();

    // allow admins or council members to edit
    try {
      const userGroups = await groupsLib.getUserGroups(session.user.id);
      const isCouncil = Array.isArray(userGroups) && userGroups.some((g: any) => {
        const slug = (g.slug || '').toString().toLowerCase();
        const name = (g.name || '').toString().toLowerCase();
        if (slug === 'student-councils' || slug === 'student-council') return true;
        if (name.includes('student') && name.includes('council')) return true;
        return false;
      });
      const isAdmin = (session.user as any).role === 'admin';
      if (!isCouncil && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (e) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = (body._id || '').toString();
    const title = (body.title || '').toString();
    const color = (body.color || '').toString();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const coll = db.collection('events');
    const filter = { _id: new ObjectId(id) };
    const update: any = { $set: {} };
    if (title) update.$set.title = title;
    if (color) update.$set.color = color;
    await coll.updateOne(filter, update);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDatabase();
    const id = (body._id || '').toString();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const coll = db.collection('events');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = (session.user as any).role === 'admin';
    // Only allow admins or the creator to delete
    if (!isAdmin && (doc.createdById !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Move to archived collection so we can restore if needed
    const delColl = db.collection('events_deleted');
    const archived = { ...doc, deletedAt: new Date(), deletedById: session.user.id };
    const res = await delColl.insertOne(archived);
    await coll.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, archivedId: res.insertedId.toString(), deletedEvent: { ...archived, _id: archived._id.toString() } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
