"use client"

import React, { useEffect, useState } from "react";
import { notify } from "@/lib/notifications";
import ApproveModeratorButton from './ApproveModeratorButton';
import RejectModeratorButton from './RejectModeratorButton';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

type Props = { onClose: () => void };
type Channel = {
  _id: string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  pendingModerators?: string[];
  allowedPostingGroups?: string[];
};

const DEFAULT_CATEGORY_ORDER = [
  'academics', 'community', 'campus-services', 'colleges', 'social', 'other',
];
const CATEGORY_LABELS: Record<string, string> = {
  academics: 'Academics',
  community: 'Community',
  'campus-services': 'Campus Services',
  colleges: 'Colleges',
  social: 'Social',
  other: 'Other',
};  

export default function AdminCreateChannelModal({ onClose }: Props) {
  const [tab, setTab] = useState<'create' | 'approvals' | 'promote' | 'groups'>('create');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<'public'|'private'>('public');
  const [passkey, setPasskey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newPostingMode, setNewPostingMode] = useState<'read-and-write'|'read-only'>('read-and-write');
  const [newAllowedPostingGroups, setNewAllowedPostingGroups] = useState<string[]>([]);

  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [applicantsMap, setApplicantsMap] = useState<Record<string, { name?: string; email?: string }>>({});

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAllowedPostingGroups, setEditAllowedPostingGroups] = useState<string[]>([]);
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [popoutChannelId, setPopoutChannelId] = useState<string | null>(null);
  const [editPostingMode, setEditPostingMode] = useState<'read-and-write'|'read-only'>('read-and-write');

  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoteConfirm, setPromoteConfirm] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);

  const router = useRouter();

  const [groups, setGroups] = useState<any[] | null>(null);
  const [groupsMembersMap, setGroupsMembersMap] = useState<Record<string, { name?: string; email?: string; profilePicUrl?: string }>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<any[] | null>(null);
  const [allUsersError, setAllUsersError] = useState<string | null>(null);
  const [allUsersDebug, setAllUsersDebug] = useState<any | null>(null);
  const [allUsersFilter, setAllUsersFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadChannels() {
      try {
        const res = await fetch('/api/channels');
        if (!mounted || !res.ok) return;
        const data = await res.json();
        setChannels(data || []);

        // fetch applicant names if present
        const ids = Array.from(new Set((data || []).flatMap((c: any) => (c.pendingModerators || []))));
        if (ids.length) {
          const r2 = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
          if (r2.ok) {
            const list = await r2.json();
            const map: Record<string, { name?: string; email?: string; profilePicUrl?: string }> = {};
            (list || []).forEach((u: any) => { if (u?.id) map[u.id] = { name: u.name, email: u.email, profilePicUrl: u.profilePicUrl }; });
            setApplicantsMap(map);
          }
        }
      } catch (e) {
        setChannels([]);
      }
    }
    async function loadGroups() {
      try {
        const r = await fetch('/api/groups');
        if (!mounted || !r.ok) return;
        const d = await r.json();
        setGroups(d || []);
        // resolve member display names
        const ids = Array.from(new Set((d || []).flatMap((g: any) => (g.members || []))));
        if (ids.length) {
          try {
            const r2 = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
            if (r2.ok) {
              const list = await r2.json();
              const map: Record<string, { name?: string; email?: string; profilePicUrl?: string }> = {};
              (list || []).forEach((u: any) => { if (u?.id) map[u.id] = { name: u.name, email: u.email, profilePicUrl: u.profilePicUrl }; });
              setGroupsMembersMap(map);
            }
          } catch (_) {
            // ignore
          }
        }
      } catch (e) {
        setGroups([]);
      }
    }
    let searchTimer: any = null;
    // watch user search input (client-only) via window event — component is client, so this is fine
    // we will not poll here; autocomplete runs on demand in the input onChange below.
    loadChannels();
    loadGroups();
    return () => { mounted = false };
  }, []);

  // Load cached member display info (keeps names after modal close/reopen)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('groupsMembersMapCache');
      if (raw) {
        const parsed = JSON.parse(raw || '{}');
        if (parsed && typeof parsed === 'object') setGroupsMembersMap((prev) => ({ ...(prev || {}), ...(parsed || {}) }));
      }
    } catch (_) { }
  }, []);

  // Persist groupsMembersMap to localStorage so reopening the modal shows names immediately
  useEffect(() => {
    try {
      localStorage.setItem('groupsMembersMapCache', JSON.stringify(groupsMembersMap || {}));
    } catch (_) { }
  }, [groupsMembersMap]);

  // Keep a ref of the current members map to avoid it being a dependency (prevents effect loops)
  const groupsMembersMapRef = React.useRef(groupsMembersMap);
  useEffect(() => { groupsMembersMapRef.current = groupsMembersMap; }, [groupsMembersMap]);

  // Keep a ref of pending profile fetches to avoid duplicate requests
  const pendingProfileFetches = React.useRef<Record<string, boolean>>({});

  // Batch queue for requested ids and a short debounce timer to send a single
  // request for many ids at once instead of one request per member.
  const batchRequestedIdsRef = React.useRef<Set<string>>(new Set());
  const batchTimerRef = React.useRef<number | null>(null);

  async function flushBatchFetch() {
    const ids = Array.from(batchRequestedIdsRef.current || []);
    batchRequestedIdsRef.current.clear();
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current as any);
      batchTimerRef.current = null;
    }
    if (!ids.length) return;
    try {
      const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      if (!r.ok) return;
      const list = await r.json();
      const mapUpdate: Record<string, any> = {};
      (list || []).forEach((u: any) => { if (u?.id) mapUpdate[u.id] = { name: u.name, email: u.email, profilePicUrl: u.profilePicUrl }; });
      // merge into state
      setGroupsMembersMap((prev) => ({ ...(prev || {}), ...mapUpdate }));
    } catch (_){
      // network error; allow retries later
    } finally {
      // clear pending flags for these ids so subsequent attempts can re-enqueue if needed
      ids.forEach((id) => { pendingProfileFetches.current[id] = false; });
    }
  }

  function scheduleBatchFetch(delay = 60) {
    if (batchTimerRef.current) return;
    batchTimerRef.current = (window.setTimeout(() => {
      flushBatchFetch();
    }, delay) as unknown) as number;
  }

  function enqueueProfileFetch(id: string) {
    if (!id) return;
    if (pendingProfileFetches.current[id]) return;
    pendingProfileFetches.current[id] = true;
    batchRequestedIdsRef.current.add(id);
    scheduleBatchFetch();
  }

  // Helper to return member info (from cache) and enqueue a batched fetch if missing
  function getMemberInfo(id: string) {
    const cur = groupsMembersMapRef.current[id];
    if (cur) return cur;
    enqueueProfileFetch(id);
    return { name: '', email: '', profilePicUrl: undefined };
  }

  // When a group is selected (or groups list changes), ensure we have display profiles
  useEffect(() => {
    if (!selectedGroupId) return;
    const g = (groups || []).find((gg: any) => gg._id === selectedGroupId);
    if (!g) return;
    const missing = (g.members || []).filter((id: string) => !groupsMembersMapRef.current[id]);
    if (!missing.length) return;
    // enqueue missing ids into the shared batch queue and flush immediately
    missing.forEach((id: string) => {
      if (!pendingProfileFetches.current[id]) {
        pendingProfileFetches.current[id] = true;
        batchRequestedIdsRef.current.add(id);
      }
    });
    // fetch right away for immediate UX
    flushBatchFetch();
  }, [selectedGroupId, groups]);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return notify.error('Enter group name');
    try {
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: newGroupName.trim(), description: newGroupDesc }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to create group'); return; }
      notify.success('Group created');
      setNewGroupName(''); setNewGroupDesc('');
      const r2 = await fetch('/api/groups'); setGroups(await r2.json() || []);
    } catch (e) { notify.error('Network error creating group'); }
  }

  async function startEditGroup(g: any) {
    setEditingGroupId(g._id);
    setEditGroupName(g.name || '');
    setEditGroupDesc(g.description || '');
  }

  async function saveGroupEdit() {
    if (!editingGroupId) return;
    const id = editingGroupId;
    if (!editGroupName.trim()) return notify.error('Enter group name');
    try {
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id, name: editGroupName.trim(), description: editGroupDesc }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to update group'); return; }
      notify.success('Group updated');
      setEditingGroupId(null);
      setEditGroupName(''); setEditGroupDesc('');
      const r2 = await fetch('/api/groups'); setGroups(await r2.json() || []);
    } catch (e) { notify.error('Network error updating group'); }
  }

  function cancelGroupEdit() {
    setEditingGroupId(null); setEditGroupName(''); setEditGroupDesc('');
  }

  async function handleDeleteGroup(id: string) {
    try {
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to delete group'); return; }
      notify.success('Group deleted');
      const r2 = await fetch('/api/groups'); setGroups(await r2.json() || []);
      setSelectedGroupId(null);
    } catch (e) { notify.error('Network error deleting group'); }
  }

  async function handleAddMember(forUserId?: string) {
    if (!selectedGroupId) return notify.error('Select a group');
    const targetId = (forUserId || '').trim();
    if (!targetId) return notify.error('Select a user to add');
    try {
      // optimistic: if we already have the user's info in `allUsers` or `userSuggestions`, apply it immediately so UI shows name/pic instead of id
      const existingUser = (allUsers || []).find((u:any) => u.id === targetId) || userSuggestions.find((u:any) => u.id === targetId);
      if (existingUser && existingUser.id) {
        setGroupsMembersMap((prev) => ({ ...(prev || {}), [existingUser.id]: { name: existingUser.name, email: existingUser.email, profilePicUrl: existingUser.profilePicUrl } }));
      }
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add-member', id: selectedGroupId, userId: targetId }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to add member'); return; }
      notify.success('Member added');
      setUserSuggestions([]);
      // update groups state with returned group if present
      if (data?.group) {
        setGroups((prev) => (prev || []).map((g: any) => g._id === data.group._id ? data.group : g));
        setSelectedGroupId(data.group._id);
        // Enqueue fetches for the newly-added user and any other missing members
        try {
          enqueueProfileFetch(targetId);
          const missing = (data.group.members || []).filter((id: string) => !groupsMembersMapRef.current[id] && id !== targetId);
          missing.forEach((id: string) => { if (!pendingProfileFetches.current[id]) { pendingProfileFetches.current[id] = true; batchRequestedIdsRef.current.add(id); } });
          // flush immediately so UI updates promptly
          flushBatchFetch();
        } catch (_){ }
      } else {
        const r2 = await fetch('/api/groups'); setGroups(await r2.json() || []);
      }
    } catch (e) { notify.error('Network error adding member'); }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedGroupId) return notify.error('Select a group');
    try {
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove-member', id: selectedGroupId, userId }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to remove member'); return; }
      notify.success('Member removed');
      if (data?.group) {
        setGroups((prev) => (prev || []).map((g: any) => g._id === data.group._id ? data.group : g));
        setSelectedGroupId(data.group._id);
      } else {
        const r2 = await fetch('/api/groups'); setGroups(await r2.json() || []);
      }
    } catch (e) { notify.error('Network error removing member'); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: name.trim(), description: description.trim(), category: category || undefined, type, passkey: type === 'private' ? passkey : undefined, postingMode: newPostingMode, allowedPostingGroups: newAllowedPostingGroups }),
      });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to create channel'); setLoading(false); return; }
      notify.success('Channel created');
      router.refresh();
      setName(''); setDescription(''); setCategory(''); setPasskey(''); setNewAllowedPostingGroups([]); setNewPostingMode('read-and-write');
      const r2 = await fetch('/api/channels'); setChannels(await r2.json() || []);
    } catch (e) {
      notify.error('Network error creating channel');
    } finally { setLoading(false); }
  }

  function confirmDelete(channelId: string) { setDeletingId(channelId); }

  async function doDelete(channelId: string) {
    setDeletingLoading(true);
    try {
      const res = await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', channelId }) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to delete channel'); setDeletingLoading(false); return; }
      notify.success('Channel deleted');
      router.refresh();
      const r2 = await fetch('/api/channels'); setChannels(await r2.json() || []);
      setDeletingId(null);
    } catch (e) {
      notify.error('Network error deleting channel');
    } finally { setDeletingLoading(false); }
  }

  async function saveEdit(c: Channel) {
    setUpdatingLoading(true);
    try {
      const payload: any = { action: 'update', channelId: c._id };
      if (editName !== (c.name || '')) payload.name = editName;
      if (editDescription !== (c.description || '')) payload.description = editDescription;
      if ((editCategory || '') !== (c.category || '')) payload.category = editCategory || undefined;
      // sync allowed posting groups
      const origGroups = (c as any).allowedPostingGroups || [];
      const newGroups = editAllowedPostingGroups || [];
      const same = origGroups.length === newGroups.length && origGroups.every((v: string, i: number) => newGroups.includes(v));
      if (!same) payload.allowedPostingGroups = newGroups;
      // posting mode
      const origPosting = (c as any).postingMode || 'read-and-write';
      if (editPostingMode !== origPosting) payload.postingMode = editPostingMode;

      const res = await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { notify.error(data?.error || 'Failed to update channel'); setUpdatingLoading(false); return; }
      notify.success('Channel updated');
      router.refresh();
      const r2 = await fetch('/api/channels'); setChannels(await r2.json() || []);
      setEditingId(null);
    } catch (e) {
      notify.error('Network error updating channel');
    } finally { setUpdatingLoading(false); }
  }

  async function doPromote() {
    if (!promoteUserId.trim()) return notify.error('Enter a user id');
    if (!promoteConfirm) { setPromoteConfirm(true); setTimeout(() => setPromoteConfirm(false), 8000); return; }
    setPromoteLoading(true);
    try {
      const res = await fetch('/api/admin/promote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: promoteUserId.trim() }) });
      const data = await res.json();
      if (!res.ok) notify.error(data?.error || 'Failed to promote user'); else { notify.success('User promoted to administrator'); setPromoteUserId(''); }
    } catch (e) { notify.error('Network error promoting user'); }
    finally { setPromoteLoading(false); setPromoteConfirm(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <style>{`.low-profile-scrollbar::-webkit-scrollbar{width:8px;height:8px}.low-profile-scrollbar::-webkit-scrollbar-track{background:transparent}.low-profile-scrollbar::-webkit-scrollbar-thumb{background-color:rgba(0,0,0,0.12);border-radius:9999px}.dark .low-profile-scrollbar::-webkit-scrollbar-thumb{background-color:rgba(255,255,255,0.08)}.low-profile-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.12) transparent}`}</style>
      <div className="bg-white dark:bg-neutral-900 rounded-md ring-1 ring-black/5 dark:ring-white/6 z-50 w-full max-w-2xl mx-4">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button className={`px-3 py-1 text-sm rounded ${tab === 'create' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => setTab('create')}>Create Channel</button>
              <button className={`px-3 py-1 text-sm rounded ${tab === 'approvals' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => setTab('approvals')}>Moderator Approvals</button>
              <button className={`px-3 py-1 text-sm rounded ${tab === 'promote' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => setTab('promote')}>Promote Admin</button>
              <button className={`px-3 py-1 text-sm rounded ${tab === 'groups' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => setTab('groups')}>Groups</button>
            </div>
            <div className="text-sm text-gray-500">Admin tools</div>
          </div>

          {tab === 'create' && (
            <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" required className="flex-1 rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                <Button type="submit" variant="default" disabled={loading || !name.trim()}>{loading ? 'Creating...' : 'Create'}</Button>
              </div>
              <div className="flex gap-2">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1 rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <div className="text-sm">Type</div>
                <select value={type} onChange={(e) => setType(e.target.value as 'public'|'private')} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                  <option value="public">Public</option>
                  <option value="private">Private (requires passkey)</option>
                </select>
                {type === 'private' && (
                  <input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="Passkey" className="ml-2 rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                )}
                <div className="ml-4">
                  <div className="text-sm">Allowed Posting Groups</div>
                  <div className="mt-1 max-h-36 overflow-auto low-profile-scrollbar border rounded p-2 bg-white dark:bg-neutral-800">
                    {groups && groups.length === 0 && <div className="text-xs text-gray-500">No groups</div>}
                    {groups && groups.map((g) => (
                      <label key={g._id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newAllowedPostingGroups.includes(g._id)} onChange={(e) => {
                          if (e.target.checked) setNewAllowedPostingGroups((s) => Array.from(new Set([...s, g._id])));
                          else setNewAllowedPostingGroups((s) => s.filter((x) => x !== g._id));
                        }} />
                        <span>{g.name} <span className="text-xs text-gray-400">({(g.members || []).length})</span></span>
                      </label>
                    ))}
                  </div>
                  {newAllowedPostingGroups.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Posting Mode</div>
                      <select value={newPostingMode} onChange={(e) => setNewPostingMode(e.target.value as any)} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                        <option value="read-and-write">Read and Write</option>
                        <option value="read-only">Read-only (only selected groups can write)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <div className="text-sm">Category</div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                  <option value="">(select)</option>
                  {(() => {
                    const fromChannels = channels ? Array.from(new Set(channels.map(c => c.category || '').filter(Boolean))) : [];
                    const extras = fromChannels.filter((cc) => cc !== 'globals' && !DEFAULT_CATEGORY_ORDER.includes(cc));
                    const ordered = DEFAULT_CATEGORY_ORDER.concat(extras).filter((cc) => cc !== 'globals');
                    return ordered.map((cat) => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>));
                  })()}
                </select>
              </div>
            </form>
          )}

          {tab === 'groups' && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Manage Groups</div>

              <div className="mb-3 grid grid-cols-1 gap-2">
                <div className="flex gap-2">
                  <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="flex-1 rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                  <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>Create</Button>
                </div>
                <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Description (optional)" className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
              </div>

              <div className="space-y-2 max-h-56 overflow-auto low-profile-scrollbar">
                {groups === null && <div className="text-sm text-gray-500">Loading...</div>}
                {groups && groups.length === 0 && <div className="text-sm text-gray-500">No groups</div>}

                {groups && groups.map((g) => {
                  const isEditing = editingGroupId === g._id;
                  const isSelected = selectedGroupId === g._id;
                  return (
                    <div key={g._id} className={`p-2 border rounded bg-white dark:bg-neutral-800 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                              <input value={editGroupDesc} onChange={(e) => setEditGroupDesc(e.target.value)} className="w-full rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800" />
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" onClick={saveGroupEdit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={cancelGroupEdit}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">{g.name}</div>
                              <div className="text-xs text-gray-500">{g.description}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  {(g.members || []).slice(0, 4).map((m: string) => {
                                    const mi = getMemberInfo(m);
                                    return mi.profilePicUrl ? (
                                      <img key={m} src={mi.profilePicUrl} alt={mi.name || m} title={mi.name || m} className="w-6 h-6 rounded-full object-cover ring-1 ring-white/60" />
                                    ) : (
                                      <div key={m} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs ring-1 ring-white/60" title={mi.name || m}>
                                        {(mi.name || '').split(' ').map((s:string)=>s[0]).slice(0,2).join('') || m.slice(0,2)}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">{(g.members || []).length} member{(g.members || []).length === 1 ? '' : 's'}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedGroupId(g._id)}>Manage</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(g._id)}>Delete</Button>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Members</div>
                          <div className="space-y-1">
                            {(g.members || []).map((m: string) => {
                              const mi = getMemberInfo(m);
                              return (
                                <div key={m} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {mi.profilePicUrl ? (
                                      <img src={mi.profilePicUrl} alt={mi.name || m} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs">{(mi.name || '').split(' ').map((s:any)=>s[0]).slice(0,2).join('') || m.slice(0,2)}</div>
                                    )}
                                    <div>
                                      <div className="text-sm"><Link href={`/account/${m}`}>{mi.name || m}</Link></div>
                                      <div className="text-xs text-gray-500">{mi.email || ''}</div>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(m)}>Remove</Button>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-2">
                            <div>
                              <button className="text-xs text-blue-600 hover:underline" onClick={async () => {
                                setAllUsersError(null);
                                setShowAllUsers((s) => !s);
                                if (!allUsers) {
                                  try {
                                    const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list', limit: 500 }) });
                                    const payload = await r.json().catch(() => null);
                                    if (!r.ok) {
                                      setAllUsersError(payload?.error || `Failed to load users (status ${r.status})`);
                                      setAllUsers([]);
                                      setAllUsersDebug(payload?.debug ?? null);
                                      return;
                                    }
                                    if (payload && payload.debug) {
                                      setAllUsersDebug(payload.debug);
                                      setAllUsers([]);
                                      setAllUsersError('No users returned — see debug below');
                                    } else {
                                      setAllUsers(payload || []);
                                      setAllUsersDebug(null);
                                      if (!payload || (Array.isArray(payload) && payload.length === 0)) {
                                        setAllUsersError('No users returned');
                                      }
                                    }
                                  } catch (e) { setAllUsersError('Network error loading users'); setAllUsers([]); }
                                }
                              }}>{showAllUsers ? 'Hide users' : 'Browse all users'}</button>
                              {allUsersError && <div className="text-xs text-red-600 mt-1">{allUsersError}</div>}
                              {allUsersDebug && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-neutral-800 border rounded text-xs">
                                  <div className="font-medium mb-1">Debug info</div>
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(allUsersDebug, null, 2)}</pre>
                                </div>
                              )}
                            </div>

                            {showAllUsers && allUsers && (
                              <div className="mt-2">
                                <div className="p-2">
                                  <input value={allUsersFilter} onChange={(e) => setAllUsersFilter(e.target.value)} placeholder="Filter users by name or email" className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                                </div>
                                <div className="border rounded bg-white dark:bg-neutral-800 max-h-64 overflow-auto">
                                  {(allUsers || []).filter((u: any) => {
                                      const curGroup = (groups || []).find((gg: any) => gg._id === selectedGroupId);
                                      const curMembers: string[] = (curGroup && Array.isArray(curGroup.members)) ? curGroup.members : [];
                                      if (selectedGroupId && curMembers.includes(u.id)) return false;
                                      const q = (allUsersFilter || '').trim().toLowerCase();
                                      if (!q) return true;
                                      return ((u.name || '').toString().toLowerCase().includes(q) || (u.email || '').toString().toLowerCase().includes(q) || (u.id || '').toString().toLowerCase().includes(q));
                                    }).map((u: any) => (
                                    <div key={u.id} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2" onClick={async () => { await handleAddMember(u.id); }}>
                                      {u.profilePicUrl ? (
                                        <img src={u.profilePicUrl} alt={u.name || u.email || u.id} className="w-6 h-6 rounded-full" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs">{(u.name || u.email || u.id).toString().slice(0,2)}</div>
                                      )}
                                      <div className="flex-1 text-xs"><div className="font-medium">{u.name || u.email || u.id}</div><div className="text-xs text-gray-500">{u.email || u.id}</div></div>
                                      <div className="text-xs text-blue-600">Add</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'approvals' && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Pending Moderator Applications</div>
              <div className="space-y-2 max-h-56 overflow-auto low-profile-scrollbar">
                {channels === null && <div className="text-sm text-gray-500">Loading...</div>}
                {channels && channels.filter(c => (c.pendingModerators || []).length > 0).length === 0 && <div className="text-sm text-gray-500">No pending applications</div>}
                {channels && channels.filter(c => (c.pendingModerators || []).length > 0).map((c) => (
                  <div key={c._id} className="border rounded p-3 bg-white dark:bg-neutral-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                      </div>
                      <div className="text-xs text-gray-500">Pending: {(c.pendingModerators || []).length}</div>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {(c.pendingModerators || []).map((appId: string) => (
                        <div key={appId} className="flex items-center gap-2">
                          <span className="text-xs truncate">{applicantsMap[appId]?.name || applicantsMap[appId]?.email || appId}</span>
                          <div className="flex items-center gap-2">
                            <ApproveModeratorButton channelId={c._id} applicantId={appId} />
                            <RejectModeratorButton channelId={c._id} applicantId={appId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'promote' && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-1">Promote User to Administrator</div>
              <div className="text-xs text-gray-500 mb-2">Paste the user's canonical id (DB _id) and press the button twice to confirm.</div>
              <div className="flex gap-2 items-center">
                <input value={promoteUserId} onChange={(e) => { setPromoteUserId(e.target.value); setPromoteConfirm(false); }} placeholder="User ID (canonical)" className="flex-1 rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                <button onClick={async () => { await doPromote(); }} disabled={promoteLoading} className={`px-3 py-1 rounded text-sm ${promoteConfirm ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100'}`}>
                  {promoteLoading ? 'Promoting...' : (promoteConfirm ? 'Confirm Promote (click again)' : 'Promote to Admin')}
                </button>
              </div>
            </div>
          )}

          {tab === 'create' && (
            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Existing channels</div>
                <div className="text-xs text-gray-500">Select to edit / delete</div>
              </div>

              <div className="mt-2 space-y-2 max-h-56 overflow-auto low-profile-scrollbar">
                {channels === null && <div className="text-sm text-gray-500">Loading...</div>}
                {channels && channels.length === 0 && <div className="text-sm text-gray-500">No channels</div>}
                {channels && channels.map((c) => (
                  <div key={c._id} className="relative flex items-center justify-between gap-3 text-sm p-2 border rounded bg-white dark:bg-neutral-800">
                    <div className="truncate w-full">
                      {editingId === c._id && popoutChannelId === null ? (
                        <div className="space-y-1">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" placeholder="Channel name" />
                          <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800" placeholder="Description (optional)" />
                          <div className="flex items-center gap-2 text-sm">
                            <div className="text-sm">Category</div>
                            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                              <option value="">(select)</option>
                              {(() => {
                                const fromChannels = channels ? Array.from(new Set(channels.map(cc => cc.category || '').filter(Boolean))) : [];
                                const extras = fromChannels.filter((cc) => cc !== 'globals' && !DEFAULT_CATEGORY_ORDER.includes(cc));
                                const ordered = DEFAULT_CATEGORY_ORDER.concat(extras).filter((cc) => cc !== 'globals');
                                return ordered.map((cat) => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>));
                              })()}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.slug}</div>
                          {c.description && <div className="text-xs text-gray-500 truncate">{c.description}</div>}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === c._id ? (
                        <>
                          <Button size="sm" variant="default" onClick={async () => { await saveEdit(c); }} disabled={updatingLoading}>{updatingLoading ? 'Saving...' : 'Save'}</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditName(''); setEditDescription(''); setEditCategory(''); }}>Cancel</Button>
                          <div className="ml-2">
                            {deletingId === c._id ? (
                              <>
                                <Button size="sm" variant="destructive" onClick={() => doDelete(c._id)} disabled={deletingLoading}>{deletingLoading ? 'Deleting...' : 'Confirm Delete'}</Button>
                                <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
                              </>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => confirmDelete(c._id)}>Delete Channel</Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setPopoutChannelId(c._id); setEditingId(c._id); setEditName(c.name || ''); setEditDescription(c.description || ''); setEditCategory(c.category || ''); setEditAllowedPostingGroups(c.allowedPostingGroups || []); setEditPostingMode((c as any).postingMode || 'read-and-write'); }} aria-label={`Open settings for ${c.name}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" role="img" aria-label="Channel settings">
                                <title>Channel settings</title>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01" />
                              </svg>
                          </Button>
                        </>
                      )}
                    </div>
                    
                  </div>
                ))}
              </div>
            </div>
          )}

          {popoutChannelId && channels && (() => {
            const ch = channels.find((x) => x._id === popoutChannelId);
            if (!ch) return null;
            return (
              <div className="fixed inset-0 z-60 flex items-center justify-center">
                <div className="fixed inset-0 bg-black/40" onClick={() => setPopoutChannelId(null)} />
                <div className="relative z-70 w-full max-w-3xl mx-4 bg-white dark:bg-neutral-900 rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/6">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-medium">Edit Channel — {ch.name}</div>
                      <Button variant="ghost" onClick={() => setPopoutChannelId(null)}>Close</Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="text-sm">Name</div>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                      </div>
                      <div>
                        <div className="text-sm">Description</div>
                        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">Category</div>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                          <option value="">(select)</option>
                          {(() => {
                            const fromChannels = channels ? Array.from(new Set(channels.map(cc => cc.category || '').filter(Boolean))) : [];
                            const extras = fromChannels.filter((cc) => cc !== 'globals' && !DEFAULT_CATEGORY_ORDER.includes(cc));
                            const ordered = DEFAULT_CATEGORY_ORDER.concat(extras).filter((cc) => cc !== 'globals');
                            return ordered.map((cat) => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>));
                          })()}
                        </select>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm">Allowed Posting Groups</div>
                        <div className="mt-1">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(groups || []).filter((g: any) => editAllowedPostingGroups.includes(g._id)).map((g: any) => (
                              <div key={g._id} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900 text-xs rounded-full flex items-center gap-2">
                                <span className="font-medium">{g.name}</span>
                                <span className="text-gray-400">{(g.members || []).length}</span>
                              </div>
                            ))}
                          </div>
                          <div className="max-h-40 overflow-auto low-profile-scrollbar border rounded p-2 grid grid-cols-2 gap-2">
                            {groups && groups.length === 0 && <div className="text-xs text-gray-500">No groups</div>}
                            {groups && groups.map((g) => (
                              <label key={g._id} className="flex items-center gap-2 text-sm rounded p-1 hover:bg-gray-50 dark:hover:bg-neutral-800">
                                <input type="checkbox" className="accent-blue-600" checked={editAllowedPostingGroups.includes(g._id)} onChange={(e) => {
                                  if (e.target.checked) setEditAllowedPostingGroups((s) => Array.from(new Set([...s, g._id])));
                                  else setEditAllowedPostingGroups((s) => s.filter((x) => x !== g._id));
                                }} />
                                <div className="flex-1 truncate">{g.name} <span className="text-xs text-gray-400">({(g.members || []).length})</span></div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        {editAllowedPostingGroups.length > 0 ? (
                          <>
                            <div className="text-sm">Posting Mode</div>
                            <div className="mt-1">
                              <select value={editPostingMode} onChange={(e) => setEditPostingMode(e.target.value as any)} className="rounded border px-2 py-1 text-sm bg-white dark:bg-neutral-800">
                                <option value="read-and-write">Read and Write</option>
                                <option value="read-only">Read-only (only selected groups can write)</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">Select groups above to enable posting mode options.</div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="default" onClick={async () => { await saveEdit(ch); setPopoutChannelId(null); }} disabled={updatingLoading}>{updatingLoading ? 'Saving...' : 'Save'}</Button>
                        <Button variant="ghost" onClick={() => { setPopoutChannelId(null); setEditingId(null); setEditName(''); setEditDescription(''); setEditCategory(''); }}>Cancel</Button>
                      </div>
                      <div className="mt-4 border-t pt-3">
                        {deletingId === ch._id ? (
                          <div className="flex items-center gap-2">
                            <Button variant="destructive" onClick={() => { doDelete(ch._id); setPopoutChannelId(null); }} disabled={deletingLoading}>{deletingLoading ? 'Deleting...' : 'Confirm Delete'}</Button>
                            <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="destructive" onClick={() => setDeletingId(ch._id)}>Delete Channel</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
