"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ActionHistory() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/account/history');
        if (!mounted) return;
        if (!res.ok) {
          setError(`Error ${res.status}`);
          setItems([]);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.history)) {
          setItems(data.history);
        } else {
          setItems([]);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(String(e?.message ?? e));
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (open) load();
    return () => { mounted = false; };
  }, [open]);

  function formatDate(d: any) {
    try {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return dt.toLocaleString('en-US');
    } catch (e) {
      return '';
    }
  }

  return (
    <div className="mt-4">
      <Button variant="ghost" size="default" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide history' : 'View history'}
      </Button>

      {open && (
        <div className="mt-2 border rounded p-2 bg-white/60 dark:bg-black/10">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-500">No recent activity.</div>
          ) : (
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              {items.map((it, idx) => (
                <li key={(it._id && it._id.toString && it._id.toString()) || idx} className="flex justify-between">
                  <div>{it.action || it.type || it.message || 'activity'}</div>
                  <div className="text-xs text-gray-400">{formatDate(it.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
