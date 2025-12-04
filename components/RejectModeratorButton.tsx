"use client";

import { useState } from "react";
import { authClient } from '@/lib/auth-client';
import { notify } from "@/lib/notifications";
import { useRouter } from "next/navigation";

interface Props {
  channelId: string;
  applicantId: string;
}

export default function RejectModeratorButton({ channelId, applicantId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const handleReject = async () => {
    setLoading(true);
    try {
      if (currentUserId && currentUserId === applicantId) {
        notify.error("You cannot reject your own application");
        setLoading(false);
        return;
      }
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject-moderator', channelId, applicantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to reject');
      notify.success('Rejected moderator application');
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleReject} disabled={loading} className="px-2 py-1 rounded border border-red-500 text-red-700 bg-transparent hover:bg-red-50 text-sm font-medium">
      {loading ? 'Rejecting…' : 'Reject'}
    </button>
  );
}
