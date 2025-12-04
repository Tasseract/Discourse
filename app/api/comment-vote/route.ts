import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const commentId = body.commentId;
    const direction = body.direction; // 'up' | 'down'
    if (!commentId || !direction) return NextResponse.json({ error: 'Missing commentId or direction' }, { status: 400 });

    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const existing = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    const userId = session.user.id;

    // prepare updated arrays
    const votes: string[] = existing.votes || [];
    const votesDown: string[] = existing.votesDown || [];

    let newVotes = votes.slice();
    let newVotesDown = votesDown.slice();

    if (direction === 'up') {
      // remove from down if present
      newVotesDown = newVotesDown.filter((id) => id !== userId);
      // toggle up
      if (newVotes.includes(userId)) newVotes = newVotes.filter((id) => id !== userId);
      else newVotes.push(userId);
    } else {
      // down
      newVotes = newVotes.filter((id) => id !== userId);
      if (newVotesDown.includes(userId)) newVotesDown = newVotesDown.filter((id) => id !== userId);
      else newVotesDown.push(userId);
    }

    await db.collection('comments').updateOne({ _id: new ObjectId(commentId) }, { $set: { votes: newVotes, votesDown: newVotesDown } });

    return NextResponse.json({ success: true, upCount: newVotes.length, downCount: newVotesDown.length, hasUp: newVotes.includes(userId), hasDown: newVotesDown.includes(userId) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
