"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intervalMs?: number;
}

// Lightweight client-side refresher that triggers a router.refresh() periodically
// so server components (like PostListServer) re-fetch current data. It only
// refreshes when the document is visible to avoid unnecessary background work.
export default function LivePostRefresher({ intervalMs = 10000 }: Props) {
  const router = useRouter();
  // local skip until timestamp (ms) to back off when server asks us to retry later
  const skipUntilRef = { current: 0 } as { current: number };

  useEffect(() => {
    let mounted = true;
    async function tick() {
      if (!mounted) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      const now = Date.now();
      if (skipUntilRef.current && now < skipUntilRef.current) {
        // We're in backoff window requested by server; skip revalidation but still refresh
        router.refresh();
        return;
      }

      // Add probabilistic revalidation to reduce number of clients hitting the server
      // on every tick. Default: 20% of ticks will attempt revalidation.
      const REVALIDATE_PROBABILITY = 0.2;
      const shouldRevalidate = Math.random() < REVALIDATE_PROBABILITY;

      if (shouldRevalidate) {
        try {
          const res = await fetch('/api/revalidate-posts', { method: 'POST' });
          if (res.status === 429) {
            // Server provided Retry-After header; respect it
            const retry = res.headers.get('Retry-After');
            const retrySec = retry ? parseInt(retry, 10) : 15;
            skipUntilRef.current = Date.now() + (retrySec * 1000);
          }
        } catch (e) {
          // ignore network errors
        }
      }

      // trigger a soft refresh of server components
      router.refresh();
    }

    const id = setInterval(tick, intervalMs);
    // Run an immediate tick on mount so users see fresh data quickly
    tick();

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [router, intervalMs]);

  return null;
}
