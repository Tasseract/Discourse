"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  channelName?: string | null;
  channelDescription?: string | null;
}

export default function ChannelOverlayPortal({ channelName, channelDescription }: Props) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const el = document.createElement('div');
    el.setAttribute('id', 'channel-overlay-portal');
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  if (!mounted || !container || !channelName) return null;

  const overlay = (
    <div className="hidden md:block pointer-events-none fixed top-3 left-3 z-0 bg-transparent opacity-10 select-none">
      <div className="text-7xl font-extrabold italic uppercase tracking-wide text-gray-200 dark:text-slate-200">{channelName}• </div>
      {channelDescription && (
        <div className="ml-5 max-w-xs text-lg uppercase italic text-gray-200 dark:text-slate-200">{channelDescription}</div>
      )}
    </div>
  );

  return createPortal(overlay, container);
}
