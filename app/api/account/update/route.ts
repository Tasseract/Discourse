import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
  const { name, description, profilePicUrl, bgClass } = body;

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    const db = await getDatabase();
    const profiles = db.collection('profiles');

  const update: any = { updatedAt: new Date() };
    if (typeof name === 'string' && name.length) update.name = name;
    if (typeof description === 'string') update.description = description;
    if (typeof profilePicUrl === 'string') update.profilePicUrl = profilePicUrl;
  if (typeof bgClass === 'string') update.bgClass = bgClass;

    await profiles.updateOne({ userId }, { $set: update }, { upsert: true });

    const saved = await profiles.findOne({ userId });
    return NextResponse.json({ ok: true, profile: saved });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
