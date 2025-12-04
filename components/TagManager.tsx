"use client";

import React, { useEffect, useState } from "react";
import TagPin from './TagPin';

type Tag = { id: string; name: string; color: string; slug?: string; channelId?: string | null };
type Channel = { id: string; name: string };

export function TagManager({ onClose }: { onClose?: () => void }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#DDD");
  const [editing, setEditing] = useState<Tag | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null); // null = global
  const [role, setRole] = useState<string | null>(null);
  

  async function load() {
    setLoading(true);
    try {
      // fetch tags for selectedChannel (global + channel-specific)
      const url = selectedChannel ? `/api/tags?channelId=${encodeURIComponent(selectedChannel)}` : '/api/tags';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      // normalize tag shape so we always have `id` (some endpoints return _id)
  const normalized = (data || []).map((x: any) => ({
  id: x.id ?? (x._id && (typeof x._id === 'string' ? x._id : String(x._id))) ?? '',
    name: x.name,
    color: x.color,
    slug: x.slug,
  channelId: x.channelId ?? x.channel ?? null,
  }));
      setTags(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load channels and tags
    (async () => {
      try {
        // fetch role first so we can filter channel choices for moderators
        const rr = await fetch('/api/role');
        let roleJson: any = null;
        if (rr.ok) {
          roleJson = await rr.json();
          setRole(roleJson?.role ?? null);
        }

        const r = await fetch('/api/channels');
        if (r.ok) {
          const c = await r.json();
          // normalize and filter channels based on role: moderators should only see channels
          // they are a member of or already moderator for
          type NormChannel = { id: string; name: string; joined: boolean; isModerator: boolean };
          const normalized: NormChannel[] = (c || []).map((x: any) => ({
            id: x._id?.toString?.() ?? x.id ?? (typeof x._id === 'string' ? x._id : String(x._id)),
            name: x.name || x.title || x.slug || 'channel',
            joined: !!x.joined,
            isModerator: !!x.isModerator,
          }));

          let filtered: NormChannel[] = normalized;
          if (roleJson?.role === 'moderator') {
            filtered = normalized.filter((ch: NormChannel) => ch.joined || ch.isModerator);
          }

          setChannels(filtered.map((ch: NormChannel) => ({ id: ch.id, name: ch.name })));
          // if selectedChannel is set but no longer available, reset to global
          if (selectedChannel && !filtered.find((ch: NormChannel) => ch.id === selectedChannel)) {
            setSelectedChannel(null);
          }
        }
      } catch (e) {
        // ignore
      }
      await load();
    })();
  }, [selectedChannel]);

  

  async function handleCreateOrUpdate(e?: React.FormEvent) {
    if (e) e.preventDefault();
  const payload = { name: name.trim(), color, channelId: selectedChannel ?? null };
    try {
      if (editing) {
        await fetch('/api/tags', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...payload }), headers: { 'Content-Type': 'application/json' } });
      } else {
        await fetch('/api/tags', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      }
      setName(''); setColor('#DDD'); setEditing(null);
      await load();
    } catch (err) { console.error(err); }
  }

  async function handleEdit(t: Tag) {
    setEditing(t);
    setName(t.name);
    setColor(t.color || '#DDD');
  }

  async function handleDelete(t: Tag) {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    try {
      await fetch('/api/tags', { method: 'DELETE', body: JSON.stringify({ id: t.id }), headers: { 'Content-Type': 'application/json' } });
      await load();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded p-4 w-full max-w-lg shadow-lg z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tag Manager</h3>
          <button onClick={onClose} aria-label="Close" className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1">✕</button>
        </div>

        <form onSubmit={handleCreateOrUpdate} className="flex flex-col gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag name" className="w-full border rounded-sm px-2 py-1 text-sm bg-transparent text-gray-500" />
          <div className="flex items-center gap-2">
            <input value={color} onChange={(e) => setColor(e.target.value)} type="color" className="w-8 h-8 p-0 border-0 bg-transparent" />
            <select
              className="border rounded-sm px-2 py-1 text-sm bg-white text-gray-700 dark:bg-neutral-800 dark:text-gray-100 border-gray-200 dark:border-neutral-700"
              value={selectedChannel ?? ''}
              onChange={(e) => setSelectedChannel(e.target.value || null)}
            >
              <option className="text-gray-700 dark:text-gray-100" value="">Global</option>
              {channels.map(c => (
                <option key={c.id} value={c.id} className="text-gray-700 dark:text-gray-100">{c.name}</option>
              ))}
            </select>
            <button type="submit" className="text-sm px-3 py-1 border rounded-sm text-gray-700 bg-gray-100 hover:bg-gray-200 ml-auto">{editing ? 'Update' : 'Create'}</button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">Preview</div>
            <div className="ml-2"><TagPin name={name || (editing ? editing.name : 'preview')} color={color} small={true} /></div>
          </div>
        </form>

        <div className="space-y-2 max-h-72 overflow-auto">
          {loading ? <div className="text-sm text-gray-500">Loading...</div> : (
            tags.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded px-2 py-2">
                <div className="flex items-center gap-3">
                  <TagPin name={t.name} color={t.color || '#DDD'} small={false} />
                  <div className="text-sm text-gray-600">{t.slug}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(t)} className="text-sm text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(t)} className="text-sm text-red-600">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TagManager;

