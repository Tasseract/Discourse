import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { voteOnPost } from '@/lib/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, direction } = body;
    if (!postId || !direction) return NextResponse.json({ error: 'Missing postId or direction' }, { status: 400 });
    if (!(direction === 'up' || direction === 'down')) return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });

    // delegate to server action which will resolve the session from headers()
    const res = await voteOnPost(postId, direction);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'Failed to vote' }, { status: 500 });
  }
}
