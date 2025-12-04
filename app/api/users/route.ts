import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDatabase();
    const users = db.collection('users');

    if (Array.isArray(body.ids)) {
      const ids = body.ids || [];
      const { ObjectId } = await import('mongodb');
      const clauses: any[] = [];
      for (const id of ids) {
        try { clauses.push({ _id: new ObjectId(id) }); } catch (e) { clauses.push({ id }); }
      }
      const query = clauses.length === 1 ? clauses[0] : { $or: clauses };
      const list = await users.find(query as any).toArray();
      const idsFound = list.map((u: any) => u._id?.toString?.() ?? u.id).filter(Boolean);
      // try to fetch profiles for these users
      const profilesColl = db.collection('profiles');
      const profiles = idsFound.length ? await profilesColl.find({ userId: { $in: idsFound } }).toArray() : [];
      const profileMap: Record<string, any> = {};
      profiles.forEach((p: any) => { if (p?.userId) profileMap[p.userId] = p; });
      const mapped = list.map((u: any) => {
        const id = u._id?.toString() ?? u.id;
        const prof = profileMap[id] || null;
        return { id, name: prof?.displayName || u.name || null, email: u.email ?? null, profilePicUrl: prof?.profilePicUrl ?? null };
      });
      return NextResponse.json(mapped);
    }

    if (body.action === 'search') {
      const q = (body.q || '').trim();
      if (!q) return NextResponse.json([], { status: 200 });
      // simple case-insensitive substring search on name or email
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const list = await users.find({ $or: [ { name: regex }, { email: regex } ] }).limit(40).toArray();
      const idsFound = list.map((u: any) => u._id?.toString?.() ?? u.id).filter(Boolean);
      const profilesColl = db.collection('profiles');
      const profiles = idsFound.length ? await profilesColl.find({ userId: { $in: idsFound } }).toArray() : [];
      const profileMap: Record<string, any> = {};
      profiles.forEach((p: any) => { if (p?.userId) profileMap[p.userId] = p; });
      const mapped = list.map((u: any) => {
        const id = u._id?.toString() ?? u.id;
        const prof = profileMap[id] || null;
        return { id, name: prof?.displayName || u.name || null, email: u.email ?? null, profilePicUrl: prof?.profilePicUrl ?? null };
      });
      return NextResponse.json(mapped);
    }

    // admin-only: list all users (bounded)
    if (body.action === 'list' || body.action === 'all') {
      // require admin role
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);
      if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      // limit to reasonable upper bound to avoid huge payloads
      const limit = typeof body.limit === 'number' ? Math.min(1000, Math.max(100, body.limit)) : 500;
      // Try a few common collections to find user documents
      const collectionsToTry = ['users', 'user', 'accounts'];
      let list: any[] = [];
      for (const colName of collectionsToTry) {
        try {
          const col = db.collection(colName as any);
          const found = await col.find({}).limit(limit).toArray();
          if (found && found.length > 0) { list = found; break; }
        } catch (e) {
          // ignore and try next
        }
      }

      // Also load profiles (may exist even if users collection is empty)
      const profilesColl = db.collection('profiles');
      const profiles = await profilesColl.find({}).toArray();

      // If we didn't find any user docs but have profiles, synthesize list from profiles
      if ((list.length === 0) && (profiles && profiles.length > 0)) {
        const mappedFromProfiles = profiles.slice(0, limit).map((p: any) => ({ id: p.userId, name: p.displayName || p.name || null, email: p.email || null, profilePicUrl: p.profilePicUrl || null }));
        return NextResponse.json(mappedFromProfiles);
      }

      // Enrich found user docs with profiles where available
      const idsFound = list.map((u: any) => u._id?.toString?.() ?? u.id).filter(Boolean);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { if (p?.userId) profileMap[p.userId] = p; });
      const mapped = list.map((u: any) => {
        const id = u._id?.toString() ?? u.id;
        const prof = profileMap[id] || null;
        return { id, name: prof?.displayName || u.name || u.metadata?.name || null, email: u.email ?? null, profilePicUrl: prof?.profilePicUrl ?? null };
      });
      // If profiles include userIds not present in mapped, append them (up to limit)
      const existingIds = new Set(mapped.map((m: any) => m.id));
      for (const p of (profiles || [])) {
        if (mapped.length >= limit) break;
        if (!p?.userId) continue;
        if (existingIds.has(p.userId)) continue;
        mapped.push({ id: p.userId, name: p.displayName || p.name || null, email: p.email || null, profilePicUrl: p.profilePicUrl || null });
      }

      if ((mapped || []).length === 0) {
        // gather debug counts to help diagnose why nothing returned
        const counts: Record<string, number> = {};
        for (const colName of collectionsToTry.concat(['profiles','groups'])) {
          try {
            const col = db.collection(colName as any);
            counts[colName] = await col.countDocuments();
          } catch (e) {
            counts[colName] = -1;
          }
        }
        return NextResponse.json({ debug: { sessionUser: session?.user ?? null, role, counts, collectionsTried: collectionsToTry } });
      }

      return NextResponse.json(mapped.slice(0, limit));
    }

    return NextResponse.json({ error: 'Missing ids or action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

