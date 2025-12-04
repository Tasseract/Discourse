import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// Simple in-memory cooldown to prevent thundering-herd revalidation.
// Note: this is per-process only. For multi-instance deployments you may
// want a distributed lock (Redis) or different strategy.
let lastRevalidatedAt = 0; // epoch ms
const DEFAULT_MIN_INTERVAL_MS = Number(process.env.REVALIDATE_POSTS_MIN_INTERVAL_MS) || 15000; // 15s

export async function POST() {
  try {
    const now = Date.now();
    const minInterval = DEFAULT_MIN_INTERVAL_MS;
    const since = now - lastRevalidatedAt;
    if (since < minInterval) {
      const retryAfterSec = Math.ceil((minInterval - since) / 1000);
      return NextResponse.json({ ok: false, error: 'Too many revalidation requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } });
    }

    // Update timestamp first to avoid race where multiple requests pass the check.
    lastRevalidatedAt = now;

    // Invalidate the 'posts' cache tag so server components that use
    // getPosts (which is tagged) will refetch fresh data on next render.
    revalidateTag("posts");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
