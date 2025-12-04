"use client";

import { useState } from "react";
import { notify } from "@/lib/notifications";
import { useRouter } from "next/navigation";

interface Props {
  channelId: string;
}

export default function ModeratorApplyButton({ channelId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-moderator', channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to apply');
      notify.success('Applied to moderate — awaiting approval');
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleApply} disabled={loading} className="px-3 py-1 rounded border border-yellow-300 text-yellow-800 bg-transparent hover:bg-yellow-50 text-sm font-medium">
      {loading ? 'Applying…' : 'Apply to Moderate'}
    </button>
  );
}
