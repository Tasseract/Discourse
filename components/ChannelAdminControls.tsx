"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notifications";

const CATEGORY_OPTIONS = [
  { value: 'academics', label: 'Academics' },
  { value: 'community', label: 'Community' },
  { value: 'campus-services', label: 'Campus Services' },
  { value: 'colleges', label: 'Colleges' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

interface Props {
  channelId: string;
  currentCategory?: string;
  currentSortIndex?: number;
}

export default function ChannelAdminControls({ channelId, currentCategory, currentSortIndex }: Props) {
  const [category, setCategory] = useState(currentCategory ?? 'other');
  const [sortIndex, setSortIndex] = useState<number | ''>(typeof currentSortIndex === 'number' ? currentSortIndex : '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const body: any = { action: 'update', channelId };
      if (category) body.category = category;
      if (sortIndex !== '') body.sortIndex = Number(sortIndex);
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update channel');
      notify.success('Channel updated');
      router.refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-1 border rounded text-sm">
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <input
        type="number"
        value={sortIndex}
        onChange={(e) => setSortIndex(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="order"
        className="w-16 p-1 border rounded text-sm"
      />
      <button onClick={handleSave} disabled={loading} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
        {loading ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
