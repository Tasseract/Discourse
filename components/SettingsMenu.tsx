"use client"

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';
const AdminCreateChannelModal = dynamic<{ onClose: () => void }>(
  () => import('./AdminCreateChannelModal').then((m: any) => m.default ?? m.AdminCreateChannelModal),
  { ssr: false }
);
const TagManager = dynamic(() => import('./TagManager').then(m => m.default || m.TagManager), { ssr: false });

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleAccount = () => {
    setOpen(false);
    router.push("/account");
  };


  const userId = session?.user?.id ?? "Not signed in";
  // Use server-resolved profile when possible to remain consistent with server-side
  // permission checks. Fall back to session-provided values or sensible defaults.
  const [serverProfile, setServerProfile] = React.useState<any | null>(null);
  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const res = await fetch('/api/role');
        if (!mounted) return;
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) setServerProfile(data.user);
        else if (data?.role) setServerProfile({ role: data.role });
      } catch (e) {
        // ignore network errors; we'll fall back to session
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const role = serverProfile?.role ?? (session?.user ? ((session as any).user?.role ?? "member") : "guest");
  const displayName = serverProfile?.name ?? session?.user?.name ?? 'Not signed in';
  const displayEmail = serverProfile?.email ?? session?.user?.email ?? 'Not signed in';
  const [showTagManager, setShowTagManager] = React.useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = React.useState(false);

  const handleAdmin = () => {
    // open admin create-channel modal instead of navigating to a non-existent /admin page
    setOpen(false);
    setShowCreateChannelModal(true);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={
          `px-3 py-1 text-sm font-medium truncate rounded-t-md ` +
          (open
            ? "bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:text-gray-100"
            : "bg-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100")
        }
      >
        Settings
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md bg-white dark:bg-neutral-900 border shadow-lg z-50">
          <div className="p-3 text-sm text-gray-700 dark:text-gray-200 border-b">
            <div className="font-medium">Name</div>
            <div className="truncate text-xs text-gray-500">{displayName}</div>
            <div className="mt-2 font-medium">Email</div>
            <div className="truncate text-xs text-gray-500">{displayEmail}</div>
            <div className="mt-2 font-medium">UserID</div>
            <div className="truncate text-xs text-gray-500">{userId}</div>
            <div className="mt-2 font-medium">Role</div>
            <div className="text-xs text-gray-500 capitalize">{role}</div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            <Button variant="ghost" size="default" onClick={handleAccount}>
              Account Settings
            </Button>
            {role === "administrator" && (
              <Button variant="default" onClick={handleAdmin}>
                Admin Settings
              </Button>
            )}

            {/* Moderator-only Tag Manager access */}
            {role === "moderator" && (
              <Button variant="outline" onClick={() => setShowTagManager(true)}>Manage Tags</Button>
            )}
          </div>
        </div>
      )}
      {showTagManager && (
        // TagManager is a client-only modal; load dynamically
        <TagManager onClose={() => setShowTagManager(false)} />
      )}
      {showCreateChannelModal && (
        <AdminCreateChannelModal onClose={() => setShowCreateChannelModal(false)} />
      )}
    </div>
  );
}
