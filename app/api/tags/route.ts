import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';

// Tags can be global (channelId omitted) or scoped to a specific channel via channelId (string)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channelId');
    const db = await getDatabase();
    const filter: any = {};
    if (channelId) {
      // return tags which are global OR belong to this channel
      filter.$or = [{ channelId: null }, { channelId }];
    }
    const tags = await db.collection('tags').find(filter).toArray();
    const mapped = tags.map((t: any) => ({ id: t._id.toString(), name: t.name, color: t.color || '#DDD', slug: t.slug, channelId: t.channelId || null }));
    return NextResponse.json(mapped);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    if (role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = (body.name || '').trim();
    const color = body.color || '#DDD';
    const channelId = body.channelId || null;
    const slug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const db = await getDatabase();
    const channelsCollection = db.collection('channels');

    // If a moderator is creating a tag scoped to a channel, ensure they are part of that channel
    if (channelId) {
      try {
        const { ObjectId } = await import('mongodb');
        const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
        if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        const isMember = (ch.members || []).includes(userId) || (ch.moderators || []).includes(userId);
        if (!isMember) return NextResponse.json({ error: 'Forbidden: not a member of channel' }, { status: 403 });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
      }
    }

    const res = await db.collection('tags').insertOne({ name, color, slug, channelId, createdAt: new Date() });
    // Ensure posts cache updates to reflect new tags if needed
    revalidateTag('posts');
    return NextResponse.json({ success: true, id: res.insertedId.toString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    if (role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    const name = (body.name || '').trim();
    const color = body.color || '#DDD';
    const channelId = body.channelId || null;
    if (!id || !name) return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });

    const { ObjectId } = await import('mongodb');
    const db = await getDatabase();
    const channelsCollection = db.collection('channels');

    // If moderator is moving/setting this tag to a channel, ensure they're part of that channel
    if (channelId) {
      try {
        const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
        if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        const isMember = (ch.members || []).includes(userId) || (ch.moderators || []).includes(userId);
        if (!isMember) return NextResponse.json({ error: 'Forbidden: not a member of channel' }, { status: 403 });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
      }
    }

    await db.collection('tags').updateOne({ _id: new ObjectId(id) }, { $set: { name, color, slug: (body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')), channelId } });
    revalidateTag('posts');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    if (role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { ObjectId } = await import('mongodb');
    const db = await getDatabase();
    const channelsCollection = db.collection('channels');

    // ensure moderator can only delete tags scoped to channels they belong to
    const tagDoc = await db.collection('tags').findOne({ _id: new ObjectId(id) });
    const tagChannelId = tagDoc?.channelId ?? null;
    if (tagChannelId) {
      try {
        const ch = await channelsCollection.findOne({ _id: new ObjectId(tagChannelId) });
        if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        const isMember = (ch.members || []).includes(userId) || (ch.moderators || []).includes(userId);
        if (!isMember) return NextResponse.json({ error: 'Forbidden: not a member of channel' }, { status: 403 });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
      }
    }

    await db.collection('tags').deleteOne({ _id: new ObjectId(id) });
    revalidateTag('posts');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
