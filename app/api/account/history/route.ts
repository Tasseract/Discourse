import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ ok: false, history: [] }, { status: 401 });

    const userId = session.user.id;
    const db = await getDatabase();

    // 'activity' collection is optional; if not present this will return []
    const activity = db.collection('activity');
    const items = await activity.find({ userId }).sort({ createdAt: -1 }).limit(50).toArray();

    return NextResponse.json({ ok: true, history: items });
  } catch (err) {
    return NextResponse.json({ ok: false, history: [], error: String(err) }, { status: 500 });
  }
}
