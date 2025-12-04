import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const db = await getDatabase();
    const coll = db.collection('groups');
    const all = await coll.find({}).toArray();
    const mapped = all.map((g: any) => ({ _id: g._id.toString(), name: g.name, description: g.description || '', members: g.members || [], membersCount: (g.members || []).length }));
    return NextResponse.json(mapped);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const db = await getDatabase();
    const coll = db.collection('groups');

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'create') {
      const name = (body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await coll.insertOne({ name, slug, description: body.description || '', members: body.members || [], createdAt: new Date() });
      return NextResponse.json({ success: true, id: res.insertedId.toString() });
    }

    if (action === 'delete') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      await coll.deleteOne({ _id: new ObjectId(id) });
      return NextResponse.json({ success: true });
    }

    if (action === 'add-member') {
      const id = body.id; const userId = body.userId;
      if (!id || !userId) return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      await coll.updateOne({ _id: new ObjectId(id) }, { $addToSet: { members: userId } });
      const updated = await coll.findOne({ _id: new ObjectId(id) });
      const mapped = updated ? { _id: updated._id.toString(), name: updated.name, description: updated.description || '', members: updated.members || [] } : null;
      return NextResponse.json({ success: true, group: mapped });
    }

    if (action === 'remove-member') {
      const id = body.id; const userId = body.userId;
      if (!id || !userId) return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      await coll.updateOne({ _id: new ObjectId(id) }, { $pull: { members: userId } });
      const updated = await coll.findOne({ _id: new ObjectId(id) });
      const mapped = updated ? { _id: updated._id.toString(), name: updated.name, description: updated.description || '', members: updated.members || [] } : null;
      return NextResponse.json({ success: true, group: mapped });
    }

    if (action === 'update') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const update: any = {};
      if (typeof body.name === 'string') update.name = body.name.trim();
      if (typeof body.description === 'string') update.description = body.description;
      if (Array.isArray(body.canPostIn)) update.canPostIn = body.canPostIn;
      if (Array.isArray(body.moderatesChannels)) update.moderatesChannels = body.moderatesChannels;
      if (Array.isArray(body.canViewChannels)) update.canViewChannels = body.canViewChannels;
      const { ObjectId } = await import('mongodb');
      await coll.updateOne({ _id: new ObjectId(id) }, { $set: update });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
