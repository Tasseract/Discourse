"use client";

import React, { useEffect, useState, useRef } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notifications';

type EventItem = { _id: string; date: string; title: string; color?: string; createdById?: string };

function startOfMonth(year:number, month:number) {
  return new Date(year, month, 1);
}

function daysInMonth(year:number, month:number) {
  return new Date(year, month+1, 0).getDate();
}

export default function Calendar() {
  const { data: session } = authClient.useSession();
  const todayIso = new Date().toISOString().slice(0,10);
  const [visibleMonth, setVisibleMonth] = useState<{ year:number; month:number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [eventsMap, setEventsMap] = useState<Record<string, EventItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#34d399');
  const [canAdd, setCanAdd] = useState(false);
  const [meLoading, setMeLoading] = useState(true);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const isAdmin = (session as any)?.user?.role === 'admin';
  const [lastDeleted, setLastDeleted] = useState<null | { archivedId: string; event: EventItem }>(null);
  const [deletePending, setDeletePending] = useState<null | { id: string; title?: string; iso?: string }>(null);
  const [editPending, setEditPending] = useState<null | EventItem>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('#34d399');

  const deleteModalRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmRef = useRef<HTMLButtonElement | null>(null);
  const editModalRef = useRef<HTMLDivElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  

  const EVENTS_COLLAPSE_THRESHOLD = 8;

  function jumpToDate(iso: string) {
    if (!iso) return;
    const year = Number(iso.slice(0,4));
    const month = Number(iso.slice(5,7)) - 1;
    setVisibleMonth({ year, month });
    // allow reflow then scroll into view and focus/select the day
    setTimeout(() => {
      const el = document.getElementById(`day-${iso}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setAddingDate(iso);
    }, 120);
  }

  function handleDeleteEvent(id: string, title?: string, iso?: string) {
    // open custom confirm UI
    setDeletePending({ id, title, iso });
  }

  async function performDelete(id: string) {
    try {
      const r = await fetch('/api/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: id }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) { notify.error(p?.error || 'Failed to delete'); return; }
      setLastDeleted({ archivedId: p?.archivedId, event: p?.deletedEvent });
      notify.success('Deleted — undo available');
      fetchMonth();
      setDeletePending(null);
      // auto-clear undo after 8s
      setTimeout(() => setLastDeleted(null), 8000);
    } catch (e) { notify.error('Network error'); }
  }

  // focus management + trap for delete modal
  useEffect(() => {
    if (!deletePending) return;
    const root = deleteModalRef.current;
    const confirmBtn = deleteConfirmRef.current;
    // focus confirm button when modal opens
    confirmBtn?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDeletePending(null); return; }
      if (e.key !== 'Tab' || !root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (active === first) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [deletePending]);

  // focus management + trap for edit modal
  useEffect(() => {
    if (!editPending) return;
    const root = editModalRef.current;
    // focus title input when modal opens
    setTimeout(() => editInputRef.current?.focus(), 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setEditPending(null); return; }
      if (e.key !== 'Tab' || !root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (active === first) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [editPending]);

  async function handleRestore(deletedId: string) {
    try {
      const r = await fetch('/api/events/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletedId }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) { notify.error(p?.error || 'Failed to restore'); return; }
      notify.success('Restored');
      setLastDeleted(null);
      fetchMonth();
    } catch (e) { notify.error('Network error'); }
  }

  function handleEditEvent(ev: EventItem) {
    setEditPending(ev);
    setEditTitle(ev.title || '');
    setEditColor(ev.color || '#34d399');
  }

  async function performEdit(id: string) {
    if (!editTitle.trim()) return notify.error('Enter title');
    try {
      const r = await fetch('/api/events', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: id, title: editTitle.trim(), color: editColor }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) { notify.error(p?.error || 'Failed to update'); return; }
      notify.success('Updated');
      setEditPending(null);
      fetchMonth();
    } catch (e) { notify.error('Network error'); }
  }

  // close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && addingDate) setAddingDate(null);
    }
    if (addingDate) window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [addingDate]);
  
  useEffect(() => { fetchMonth(); }, [visibleMonth.year, visibleMonth.month]);

  async function fetchMonth() {
    setLoading(true);
    try {
      const mm = `${visibleMonth.year}-${String(visibleMonth.month+1).padStart(2,'0')}`;
      const r = await fetch(`/api/events?month=${encodeURIComponent(mm)}`);
      if (!r.ok) { setEventsMap({}); setLoading(false); return; }
      const list = await r.json();
      const map: Record<string, EventItem[]> = {};
      (list || []).forEach((e: any) => {
        const d = e.date;
        map[d] = map[d] || [];
        map[d].push({ _id: e._id, date: d, title: e.title, color: e.color, createdById: e.createdById });
      });
      setEventsMap(map);
    } catch (e) {
      setEventsMap({});
    } finally { setLoading(false); }
  }

  function prevMonth() { setVisibleMonth(s => {
    const m = s.month - 1; if (m < 0) return { year: s.year - 1, month: 11 }; return { year: s.year, month: m };
  }); }
  function nextMonth() { setVisibleMonth(s => {
    const m = s.month + 1; if (m > 11) return { year: s.year + 1, month: 0 }; return { year: s.year, month: m };
  }); }

  // fetch /api/me to determine group membership so we can hide Add UI for non-council users
  useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      setMeLoading(true);
      try {
        const r = await fetch('/api/me');
        if (!mounted || !r.ok) { setCanAdd(false); return; }
        const payload = await r.json();
        const groups: any[] = payload?.groups || [];
        const isCouncil = groups.some((g: any) => (g.slug || '').toString() === 'student-councils' || (g.name || '').toString().toLowerCase().includes('student') && (g.name || '').toString().toLowerCase().includes('council'));
        if (mounted) setCanAdd(!!isCouncil);
      } catch (e) {
        if (mounted) setCanAdd(false);
      } finally { if (mounted) setMeLoading(false); }
    }
    fetchMe();
    return () => { mounted = false; };
  }, [session]);

  async function handleAdd() {
    if (!addingDate || !newTitle.trim()) return notify.error('Enter title');
    try {
      const r = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: addingDate, title: newTitle.trim(), color: newColor }) });
      const payload = await r.json();
      if (!r.ok) { notify.error(payload?.error || 'Failed to add event'); return; }
      notify.success('Event added');
      setNewTitle(''); setAddingDate(null);
      fetchMonth();
    } catch (e) { notify.error('Network error'); }
  }

  const monthStart = startOfMonth(visibleMonth.year, visibleMonth.month);
  const firstWeekday = monthStart.getDay();
  const totalDays = daysInMonth(visibleMonth.year, visibleMonth.month);

  const cells: Array<{ day:number | null, iso?:string }> = [];
  for (let i=0;i<firstWeekday;i++) cells.push({ day: null });
  for (let d=1; d<=totalDays; d++) {
    const iso = `${visibleMonth.year}-${String(visibleMonth.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, iso });
  }

  return (
    <div className="mx-auto my-6 w-full max-w-xl h-[min(80vh,700px)] overflow-hidden p-2 bg-white dark:bg-neutral-900 rounded-md border border-gray-100 dark:border-neutral-800 flex flex-col text-sm shadow-none">
      <style>{`
        .calendar-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .calendar-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 999px; }
        .calendar-scroll::-webkit-scrollbar-track { background: transparent; }
        .calendar-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.12) transparent; }
      `}</style>
          <div className="sticky top-0 bg-white dark:bg-neutral-900 z-30 py-1">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{new Date(visibleMonth.year, visibleMonth.month).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 relative z-30"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 relative z-30"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
            </div>
          </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-center mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (<div key={d} className="font-medium">{d}</div>))}
      </div>
      <div className="flex-1 overflow-auto calendar-scroll">
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c.day) return <div key={idx} className="h-12" />;
          const events = eventsMap[c.iso || ''] || [];
          const isToday = c.iso === todayIso;
          const colors = (events || []).map(ev => ev.color || '#06b6d4');
          const hasEvents = colors.length > 0;
          const borderColor = colors[0] || null;

          return (
            <div
              key={idx}
              id={c.iso ? `day-${c.iso}` : undefined}
              className={`relative h-16 p-2 border border-gray-100 dark:border-neutral-800 box-border overflow-hidden rounded-sm flex flex-col ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''} ${!meLoading && canAdd ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800' : ''}`}
              style={hasEvents ? { border: `2px solid ${borderColor}` } : undefined}
              role={(!meLoading && canAdd) ? 'button' : undefined}
              tabIndex={(!meLoading && canAdd) ? 0 : undefined}
              onClick={() => { if (!meLoading && canAdd) setAddingDate(c.iso || null); }}
              onKeyDown={(e) => { if ((!meLoading && canAdd) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setAddingDate(c.iso || null); } }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {/* Date badge - border color reflects event color when single event; multiple events show a segmented bar below */}
                  {
                    (() => {
                      function getHoliday(iso?: string) {
                        if (!iso) return null;
                        const md = iso.slice(5); // MM-DD
                        // small set of common holidays (month-day based)
                        const map: Record<string,string> = {
                          '01-01': "New Year's Day",
                          '07-04': 'Independence Day',
                          '12-25': 'Christmas Day',
                          '11-11': 'Veterans Day',
                          '12-31': "New Year's Eve",
                        };
                        return map[md] || null;
                      }

                      const holiday = getHoliday(c.iso);

                      return (
                        <div className="flex flex-col items-start">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full">
                              <div className="text-sm font-medium">{c.day}</div>
                            </div>
                            {holiday && (
                              <div className="absolute top-1 right-1" title={holiday} aria-label={holiday}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4"/></svg>
                              </div>
                            )}
                          {/* no inline event markers - keep cell border highlight only */}
                        </div>
                      );
                    })()
                  }
                  {/* add button intentionally hidden for cleaner UI; day remains clickable to add if allowed */}
                </div>
                <div>{/* removed per-day count badge - events listed below */}</div>
              </div>
              <div className="mt-1 flex-1" />
              <div className="mt-auto pt-1 text-[11px] text-gray-500 dark:text-neutral-400">
                {/* footer intentionally left blank for non-council users; day itself is pressable when allowed */}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      {/* Events table below calendar (Date -> color + event) */}
      <div className="mt-3 border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Events</div>
          {/* show toggle if many entries */}
          {(() => {
            const monthKey = `${visibleMonth.year}-${String(visibleMonth.month+1).padStart(2,'0')}`;
            const entries = Object.entries(eventsMap).filter(([k]) => k.startsWith(monthKey)).sort((a,b) => a[0].localeCompare(b[0]));
            if (entries.length === 0) return null;
            if (entries.length > EVENTS_COLLAPSE_THRESHOLD) {
              return (
                <button className="text-sm text-blue-600 hover:underline" onClick={() => setEventsExpanded(x => !x)}>
                  {eventsExpanded ? 'Hide events' : `Show ${entries.length} days`}
                </button>
              );
            }
            return null;
          })()}
        </div>
          {(() => {
          const entries = Object.entries(eventsMap).filter(([k]) => {
            try {
              const d = new Date(k);
              return d.getFullYear() === visibleMonth.year && d.getMonth() === visibleMonth.month;
            } catch (e) { return false; }
          }).sort((a,b) => a[0].localeCompare(b[0]));
          if (entries.length === 0) return <div className="text-sm text-gray-500">No events this month</div>;
          if (!eventsExpanded && entries.length > EVENTS_COLLAPSE_THRESHOLD) {
            return (
              <div className="text-sm text-gray-600">{entries.length} days have events. <button className="text-blue-600 hover:underline" onClick={() => setEventsExpanded(true)}>Show events</button></div>
            );
          }
          return (
            <div className="flex flex-col gap-2 max-h-44 overflow-auto pr-2 calendar-scroll">
              {entries.map(([iso, evs]) => (
                <div key={iso} className="">
                    <button onClick={() => jumpToDate(iso)} className="text-sm font-semibold text-left text-blue-600 hover:underline">
                    {new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </button>
                  <div className="mt-1 ml-3 flex flex-col gap-1">
                    {evs.map(ev => (
                      <div key={ev._id} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full" style={{ background: ev.color || '#06b6d4' }} />
                        <span className="flex-1">{ev.title}</span>
                        {(isAdmin || (session && ev.createdById === (session as any).user?.id)) && (
                          <div className="flex items-center gap-2">
                            <button title="Edit" onClick={() => handleEditEvent(ev)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Edit event">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 21v-3.6l11.1-11.1a2 2 0 1 1 2.8 2.8L7.8 20.2H3z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button title="Delete" onClick={() => handleDeleteEvent(ev._id, ev.title, ev.date)} className="p-1 text-red-500 hover:text-red-700" aria-label="Delete event">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      {addingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddingDate(null)} />
            <div className="relative bg-white dark:bg-neutral-900 rounded-md p-3 w-full max-w-sm mx-4 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Add event on {addingDate}</div>
              <button onClick={() => setAddingDate(null)} aria-label="Close" className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded border border-gray-100 dark:border-neutral-800 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-800 dark:text-gray-200 px-2 py-1"
            />
            <div className="flex items-center gap-2 mt-3">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
              <div className="flex items-center gap-2 ml-auto">
                <Button size="sm" onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">Save</Button>
                <button onClick={() => setAddingDate(null)} className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deletePending && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeletePending(null)} />
          <div ref={deleteModalRef} className="relative bg-white dark:bg-neutral-900 rounded-md p-3 w-full max-w-sm mx-4 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="font-medium mb-2">Confirm delete</div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mb-3">Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deletePending.title || 'this event'}</strong>{deletePending.iso ? ` on ${new Date(deletePending.iso).toLocaleDateString('en-US')}` : ''}?</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletePending(null)} className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">Cancel</button>
              <button ref={deleteConfirmRef} onClick={() => performDelete(deletePending.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      {editPending && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditPending(null)} />
          <div ref={editModalRef} className="relative bg-white dark:bg-neutral-900 rounded-md p-3 w-full max-w-sm mx-4 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="font-medium mb-2">Edit event</div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">Editing <strong className="text-gray-900 dark:text-white">{editPending.title}</strong> ({new Date(editPending.date).toLocaleDateString('en-US')})</div>
            <input ref={editInputRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full rounded border border-gray-100 dark:border-neutral-800 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-800 dark:text-gray-200 px-2 py-1 mb-2" />
            <div className="flex items-center gap-2">
              <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setEditPending(null)} className="text-sm px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">Cancel</button>
                <button onClick={() => performEdit(editPending._id)} className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
