"use client";

import React, { useEffect, useRef } from 'react';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ open, title = 'Confirm', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmModalProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // focus confirm button when opened
    setTimeout(() => confirmRef.current?.focus(), 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key !== 'Tab' || !rootRef.current) return;
      const focusable = Array.from(rootRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
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
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div ref={rootRef} role="dialog" aria-modal="true" className="relative bg-white dark:bg-neutral-900 rounded-md p-4 w-full max-w-md mx-4 shadow-sm border border-gray-100 dark:border-neutral-800">
        <div className="font-medium mb-2">{title}</div>
        {description && <div className="text-sm text-gray-700 dark:text-gray-200 mb-3">{description}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">{cancelLabel}</button>
          <button ref={confirmRef} onClick={onConfirm} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
