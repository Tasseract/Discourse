import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as groupsLib from '@/lib/groups';

export async function GET(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ user: null, groups: [] });
    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);
    const groups = await groupsLib.getUserGroups(session.user.id);
    const mapped = (groups || []).map((g: any) => ({ _id: g._id?.toString?.() ?? g._id, name: g.name, slug: g.slug, members: g.members || [] }));
    return NextResponse.json({ user: { id: session.user.id }, role, groups: mapped });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
