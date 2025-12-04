"use client";

import { useState } from "react";
import { notify } from "@/lib/notifications";
import { useRouter } from "next/navigation";

interface ChannelJoinButtonProps {
  channelId: string;
  initiallyJoined?: boolean;
  isPrivate?: boolean;
}

export default function ChannelJoinButton({ channelId, initiallyJoined = false, isPrivate = false }: ChannelJoinButtonProps) {
  const [joined, setJoined] = useState<boolean>(initiallyJoined);
  const [loading, setLoading] = useState(false);
  const [showPassInput, setShowPassInput] = useState(false);
  const [passkey, setPasskey] = useState('');
  const router = useRouter();

  const submitJoin = async (pass?: string) => {
    if (joined) return;
    setLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', channelId, passkey: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to join');
      notify.success('Joined channel');
      setJoined(true);
      setShowPassInput(false);
      setPasskey('');
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to join channel');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!joined) return;
    setLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to leave');
      notify.success('Left channel');
      setJoined(false);
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to leave channel');
    } finally {
      setLoading(false);
    }
  };

  // Low-profile UI: when the channel is private and not joined, clicking Join expands a small inline password input
  if (joined) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">Joined</span>
        <button
          onClick={handleLeave}
          disabled={loading}
          className="px-2 py-0.5 rounded border border-red-200 text-red-700 bg-transparent text-xs hover:bg-red-50"
        >
          {loading ? 'Leaving…' : 'Leave'}
        </button>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="flex items-center gap-2">
        {!showPassInput ? (
          <button
            onClick={() => setShowPassInput(true)}
            disabled={loading}
            className="px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-50"
            title="Join private channel"
          >
            🔒 Join
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="passkey"
              className="text-xs rounded border px-2 py-1 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitJoin(passkey);
                if (e.key === 'Escape') {
                  setShowPassInput(false);
                  setPasskey('');
                }
              }}
            />
            <button
              onClick={() => submitJoin(passkey)}
              disabled={loading || passkey.trim() === ''}
              className="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 text-xs bg-transparent hover:bg-emerald-50"
            >
              {loading ? 'Joining…' : 'Enter'}
            </button>
            <button
              onClick={() => {
                setShowPassInput(false);
                setPasskey('');
              }}
              className="px-2 py-0.5 rounded bg-transparent text-xs text-gray-600 border border-gray-100 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => submitJoin(undefined)}
        disabled={loading}
        className="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 text-xs bg-transparent hover:bg-emerald-50 font-medium"
      >
        {loading ? 'Joining…' : 'Join'}
      </button>
    </div>
  );
}
