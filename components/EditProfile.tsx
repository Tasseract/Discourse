"use client";

import React, { useState, useRef } from "react";
import EditButton from "@/components/EditButton";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from "@/assets/discourse.svg";

export default function EditProfile({ initial }: { initial?: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [profilePicUrl, setProfilePicUrl] = useState(initial?.profilePicUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(initial ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Preset pastel color bases users can choose from (store the base e.g. 'bg-pink-100')
  const presets = [
  "bg-[#3CA8FF]", // vivid sky blue
  "bg-[#A67B2D]", // rich golden brown
  "bg-[#8B4BCF]", // deep violet purple
  "bg-[#B43434]", // strong coral red
  "bg-[#4E9E3C]", // forest green
  "bg-[#B7AC27]", // bright olive yellow
  "bg-[#D46A63]", // warm rose
  "bg-[#6DC3A3]", // deeper mint teal
  "bg-[#7A7A7A]", // medium neutral gray
  ];

  const [selectedBg, setSelectedBg] = useState<string>(initial?.bgClass ?? presets[0]);
  const displayBgClass = `${selectedBg} dark:${selectedBg.replace(/-100$/, "-500")}`;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/account/update', { method: 'POST', body: JSON.stringify({ name, description, profilePicUrl, bgClass: selectedBg }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data?.ok) {
        setSavedProfile(data.profile);
        if (data.profile?.bgClass) setSelectedBg(data.profile.bgClass);
        setEditing(false);
      }
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // send base64 data URL to server upload endpoint
      const res = await fetch('/api/account/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl, filename: file.name }) });
      const data = await res.json();
      if (data?.ok && data.url) {
        setProfilePicUrl(data.url);
      }
    } catch (e) {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
  }

  return (
    <div>
  {!editing ? (
        
        <div className="flex items-center gap-4">
            <div className={`w-16 h-16 relative rounded-full overflow-hidden ${displayBgClass}`}>
              {savedProfile?.profilePicUrl || profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={savedProfile?.profilePicUrl ?? profilePicUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/70">
                  <Image src={logo} alt="logo" width={89} height={28} />
                </div>
              )}
            </div>
          <div className="flex-1">
            <div className="text-sm text-gray-800 dark:text-gray-100">{savedProfile?.name ?? name ?? 'Not signed in'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{savedProfile?.description ?? description ?? 'No description set.'}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <EditButton onClick={() => setEditing(true)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300">Display name</label>
              <input
                className="w-full p-2 border rounded mt-1 bg-white/90 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                className="w-full p-2 border rounded mt-1 bg-white/90 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300">Profile picture URL (or upload)</label>
              <input
                className="w-full p-2 border rounded mt-1 bg-white/90 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500"
                value={profilePicUrl}
                onChange={(e) => setProfilePicUrl(e.target.value)}
              />
            </div>

            <div className="flex gap-2 items-center">
              <input ref={fileRef} onChange={handleFileChange} type="file" accept="image/*" className="hidden" />
              <Button variant="ghost" size="default" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload image'}</Button>
              <Button variant="default" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Pick a background color</div>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const darkP = p.replace(/-100$/, '-500');
                  const cls = `${p} dark:${darkP} w-8 h-8 rounded-full border`;
                  const isSelected = selectedBg === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedBg(p)}
                      className={`${cls} ${isSelected ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`}
                      aria-pressed={isSelected}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-28 h-28 relative rounded-full overflow-hidden ${displayBgClass}`}>
                {profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePicUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/90 dark:bg-neutral-900/40">
                  <Image src={logo} alt="logo" width={120} height={40} />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">Preview</div>
          </div>
        </div>
      )}
    </div>
  );
}
