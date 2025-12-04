"use client";

import React, { useState, useEffect, useRef } from "react";
import Calendar from './Calendar';
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSort = searchParams?.get('sort') || 'top';
  const initialQ = searchParams?.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState<string>(initialSort);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (sort) params.set('sort', sort);
    // navigate to home with query (other params can be added later)
    router.push(`/?${params.toString()}`);
  };

  const onSortChange = (next: string) => {
    setSort(next);
    const params = new URLSearchParams(window.location.search);
    if (q.trim()) params.set('q', q.trim());
    params.set('sort', next);
    router.push(`/?${params.toString()}`);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalendarOpen(false);
    };
    if (menuOpen || calendarOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen, calendarOpen]);

  // Close on Escape when either popover is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setCalendarOpen(false);
      }
    }
    if (menuOpen || calendarOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, calendarOpen]);

  return (
    <form onSubmit={onSubmit} className="flex items-center w-full max-w-md">
      <div className="mr-2 flex items-center gap-2">
        <div className="relative" ref={calendarRef}>
            <button type="button" aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((s) => !s)} className="p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none" aria-label="Open calendar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" ry="2" />
                <path d="M16 3v2M8 3v2M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {calendarOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
                <div className="absolute inset-0 bg-black/30" onClick={() => setCalendarOpen(false)} />
                <div className="relative z-50 w-[36rem] max-w-full p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-white dark:bg-neutral-900 rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/6 relative transition transform duration-150 ease-out">
                    <Calendar />
                  </div>
                </div>
              </div>
            )}
        </div>
        <div className="relative" ref={menuRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((s) => !s)} className="p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none" aria-label="Open sort menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          {menuOpen && (
            <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded shadow-sm z-40">
              <button onClick={() => { onSortChange('top'); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm ${sort === 'top' ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Top</button>
              <button onClick={() => { onSortChange('new'); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm ${sort === 'new' ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Newest</button>
              <button onClick={() => { onSortChange('comments'); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm ${sort === 'comments' ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Most commented</button>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          aria-label="Search posts"
          className="w-full pl-2 pr-2 py-1 rounded text-sm bg-transparent border border-gray-100 dark:border-neutral-800 placeholder:text-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none"
        />
      </div>
    </form>
  );
}
