import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const db = await getDatabase();
    const comments = await db.collection('comments').find({ postId }).sort({ createdAt: 1 }).toArray();

    // resolve session to compute per-user vote flags
    let session = null;
    try {
      const auth = await getAuth();
      session = await auth.api.getSession({ headers: await headers() });
    } catch (e) {
      session = null;
    }
    const viewerId = session?.user?.id ?? null;

    // gather unique authorIds to fetch their profiles in one go
    const authorIds = Array.from(new Set(comments.map((c: any) => c.authorId).filter(Boolean)));
    let profileMap: Record<string, any> = {};
    if (authorIds.length) {
      try {
        const profiles = await db.collection('profiles').find({ userId: { $in: authorIds } }).toArray();
        profiles.forEach((p: any) => {
          profileMap[p.userId] = p;
        });
      } catch (e) {
        // ignore profile lookup errors
      }
    }

    const mapped = comments.map((c: any) => {
      const votes = c.votes || [];
      const votesDown = c.votesDown || [];
      return {
        id: c._id.toString(),
        postId: c.postId,
        parentId: c.parentId ?? null,
        body: c.body,
        createdAt: c.createdAt,
        authorId: c.authorId,
        authorName: c.authorName,
        upCount: votes.length,
        downCount: votesDown.length,
        hasUp: viewerId ? votes.includes(viewerId) : false,
        hasDown: viewerId ? votesDown.includes(viewerId) : false,
        // attach profile info when available so clients can render avatars
        authorProfilePic: profileMap[c.authorId]?.profilePicUrl ?? null,
        authorBgClass: profileMap[c.authorId]?.bgClass ?? null,
      };
    });
    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
  const postId = body.postId;
  const text = (body.body || '').toString().trim();
  const parentId = body.parentId ?? null;
  if (!postId || !text) return NextResponse.json({ error: 'Missing postId or body' }, { status: 400 });

    const db = await getDatabase();
    const doc = {
      postId,
      parentId,
      body: text,
      authorId: session.user.id,
      authorName: session.user.name || session.user.email || 'user',
      createdAt: new Date(),
      votes: [],
      votesDown: [],
    };
    const res = await db.collection('comments').insertOne(doc);
    // increment comment count on the post document for quick access
      try {
        await db.collection('posts').updateOne({ _id: new (await import('mongodb')).ObjectId(postId) }, { $inc: { commentsCount: 1 } });
        // invalidate cached posts so listing reflects the new comment count
        try { revalidateTag('posts'); } catch (err) { /* ignore revalidation errors */ }
      } catch (e) {
        // Log increment failure so we can debug if counts aren't updating
        console.error('Failed to increment commentsCount for post', postId, e);
      }

    // build response comment and attach profile info if available
    const responseComment: any = { id: res.insertedId.toString(), ...doc };
    try {
      const prof = await db.collection('profiles').findOne({ userId: session.user.id });
      if (prof) {
        responseComment.authorProfilePic = prof.profilePicUrl ?? null;
        responseComment.authorBgClass = prof.bgClass ?? null;
      }
    } catch (e) {
      // ignore
    }

    // log activity (best-effort)
    try {
      const { logActivity } = await import('@/lib/logActivity');
      await logActivity(session.user.id, 'comment.created', 'comment', text.slice(0, 200), { postId, commentId: res.insertedId.toString(), parentId });
    } catch (e) {
      console.error('Failed to log comment.created', e);
    }

    return NextResponse.json({ success: true, comment: responseComment });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const commentId = body.commentId;
    const text = (body.body || '').toString().trim();
    if (!commentId || !text) return NextResponse.json({ error: 'Missing commentId or body' }, { status: 400 });

    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const existing = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (existing.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.collection('comments').updateOne({ _id: new ObjectId(commentId) }, { $set: { body: text } });
    // log edit activity
    try {
      const { logActivity } = await import('@/lib/logActivity');
      await logActivity(session.user.id, 'comment.edited', 'comment', text.slice(0, 200), { commentId });
    } catch (e) {
      console.error('Failed to log comment.edited', e);
    }

    return NextResponse.json({ success: true, commentId, body: text });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const commentId = url.searchParams.get('commentId');
    if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 });

    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const existing = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (existing.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // delete the comment and any replies (cascade)
    const toDeleteIds = [existing._id.toString()];
    // find replies
    const replies = await db.collection('comments').find({ parentId: commentId }).toArray();
    replies.forEach((r: any) => toDeleteIds.push(r._id.toString()));

    // perform deletes
    await db.collection('comments').deleteMany({ _id: { $in: toDeleteIds.map((id) => new ObjectId(id)) } });

    // decrement comment count on post by number deleted
    try {
      await db.collection('posts').updateOne({ _id: new ObjectId(existing.postId) }, { $inc: { commentsCount: -toDeleteIds.length } });
      try { revalidateTag('posts'); } catch (err) { /* ignore */ }
    } catch (e) {
      console.error('Failed to decrement commentsCount for post', existing.postId, e);
    }

    // log delete activity
    try {
      const { logActivity } = await import('@/lib/logActivity');
      await logActivity(session.user.id, 'comment.deleted', 'comment', `deleted ${toDeleteIds.length} comments`, { deletedIds: toDeleteIds, postId: existing.postId });
    } catch (e) {
      console.error('Failed to log comment.deleted', e);
    }

    return NextResponse.json({ success: true, deleted: toDeleteIds.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
