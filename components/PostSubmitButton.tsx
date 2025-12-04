"use client";

import React, { useEffect, useRef, useState } from "react";
import { PostSubmissionForm } from "./PostSubmissionForm";

export default function PostSubmitButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-1.5 rounded text-sm text-[#00684A] bg-transparent border border-gray-100 dark:border-neutral-800 hover:bg-gray-50"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Create post"
        title="Create post"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
        </svg>
        <span className="uppercase tracking-wide text-xs">POST</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Create Post</h3>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-red-600">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <PostSubmissionForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
