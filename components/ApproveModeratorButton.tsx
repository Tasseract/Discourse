"use client";

import { useState } from "react";
import { authClient } from '@/lib/auth-client';
import { notify } from "@/lib/notifications";
import { useRouter } from "next/navigation";

interface Props {
  channelId: string;
  applicantId: string;
}

export default function ApproveModeratorButton({ channelId, applicantId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (currentUserId && currentUserId === applicantId) {
        notify.error("You cannot approve your own application");
        setLoading(false);
        return;
      }
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-moderator', channelId, applicantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to approve');
      notify.success('Approved moderator');
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleApprove} disabled={loading} className="px-2 py-1 rounded border border-emerald-500 text-emerald-700 bg-transparent hover:bg-emerald-50 text-sm font-medium">
      {loading ? 'Approving…' : 'Approve'}
    </button>
  );
}
