import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  try {
    const auth = await getAuth();
    let session = null;
    try {
      session = await auth.api.getSession({ headers: await headers() });
    } catch (e) {
      session = null;
    }

    const { resolveRoleFromSession } = await import('@/lib/getRole');
    const role = await resolveRoleFromSession(session);

    // Try to return a canonical user profile when available
    let profile: any = null;
    if (session?.user) {
      const db = await getDatabase();
      const users = db.collection('users');
      const userId = session.user?.id;
      const email = session.user?.email;

      const orClauses: any[] = [];
      if (userId) {
        try {
          orClauses.push({ _id: new ObjectId(userId) });
        } catch (e) {
          orClauses.push({ id: userId });
        }
      }
      if (email) orClauses.push({ email });

      let query: any = {};
      if (orClauses.length === 1) query = orClauses[0];
      else if (orClauses.length > 1) query = { $or: orClauses };

      if (Object.keys(query).length > 0) {
        try {
          const user = await users.findOne(query as any);
          if (user) {
            profile = {
              id: user._id?.toString() ?? user.id,
              name: user.name ?? user.metadata?.name ?? session.user?.name,
              email: user.email ?? session.user?.email,
              emailVerified: user.emailVerified ?? user.email_verified ?? null,
              createdAt: user.createdAt ?? null,
              updatedAt: user.updatedAt ?? null,
              role: user.role ?? user.metadata?.role ?? role,
            };
          }
        } catch (e) {
          // ignore DB errors
        }
      }
    }

    // If we didn't resolve a DB-backed profile, fall back to session values
    if (!profile && session?.user) {
      profile = {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        emailVerified: (session.user as any).emailVerified ?? null,
        createdAt: null,
        updatedAt: null,
        role,
      };
    }

    const resp: any = { role, user: profile };
    // In development, include some debug info to help diagnose why a user
    // may still appear as 'member' (session contents, whether DB user found).
    if (process.env.NODE_ENV !== 'production') {
      resp.debug = {
        sessionUser: session?.user ?? null,
        foundDbUser: !!profile && !!(profile?.createdAt || profile?.email || profile?.name),
      };
    }

    return NextResponse.json(resp);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
