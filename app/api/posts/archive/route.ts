import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const postId = body.postId;
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const existing = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Only allow the original submitter to archive their own post
    if (existing.submittedById !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Soft-delete: mark archived so only direct DB ops can permanently remove
    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $set: { archived: true, archivedAt: new Date(), archivedBy: session.user.id } }
    );

    // Invalidate posts cache so UI updates
    try { revalidateTag('posts'); } catch (e) { /* ignore */ }

    // Best-effort activity log
    try {
      const { logActivity } = await import('@/lib/logActivity');
      await logActivity(session.user.id, 'post.archived', 'post', `archived ${postId}`, { postId });
    } catch (e) {
      // ignore logging failures
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
