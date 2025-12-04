"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface NavItem {
  key: string;
  label: string;
  href?: string;
}

interface NavTabsProps {
  items: NavItem[];
  defaultKey?: string;
  className?: string;
}

export default function NavTabs({ items, defaultKey, className = "" }: NavTabsProps) {
  const [active, setActive] = useState<string>(defaultKey ?? (items[0] && items[0].key) ?? "");

  // update active if defaultKey changes (e.g., when server passes a channel id)
  useEffect(() => {
    if (defaultKey) setActive(defaultKey);
  }, [defaultKey]);

  return (
    <div className={`flex items-center ${className}`} role="tablist">
      {items.map((it) => {
        const isActive = it.key === active;
        const base = "px-3 py-1.5 rounded-t-md text-sm font-medium truncate";
        const activeCls = "bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:text-gray-100";
        const inactiveCls = "bg-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100";

        const content = (
          <span className={`${base} ${isActive ? activeCls : inactiveCls}`}>{it.label}</span>
        );

        return (
          <div key={it.key} role="tab" aria-selected={isActive} onClick={() => setActive(it.key)}>
            {it.href ? (
              <Link href={it.href}>{content}</Link>
            ) : (
              // if no href provided, render a button-like clickable span
              <button className="bg-transparent border-0 p-0" onClick={() => setActive(it.key)}>
                {content}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
