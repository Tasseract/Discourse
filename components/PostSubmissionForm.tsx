"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PostSubmissionSchema, type PostSubmission } from "@/lib/schemas";
import { notify } from "@/lib/notifications";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { submitPost } from "@/lib/actions";
import { authClient } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";
import { debug } from '@/lib/logger';
import TagPin from './TagPin';

export function PostSubmissionForm() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const form = useForm<PostSubmission>({
    resolver: zodResolver(PostSubmissionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { formState: { isSubmitting } } = form;
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [channels, setChannels] = useState<Array<any>>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [userGroupIds, setUserGroupIds] = useState<string[] | null>(null);
  const [tags, setTags] = useState<Array<any>>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // fetch channels on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/channels');
        if (res.ok) {
          const data = await res.json();
          // Fetch all groups to determine whether the current user belongs to any allowed posting groups
          let groups: any[] = [];
          try {
            const rg = await fetch('/api/groups');
            if (rg.ok) groups = await rg.json();
          } catch (e) { groups = []; }

          const userId = session?.user?.id;
          // session.user may not include a `role` field on the client shape; cast to any to read if present.
          const role = (session as any)?.user?.role ?? null;
          // normalize members to strings and compute set of group ids the current user belongs to
          const normalizedGroups = (groups || []).map((g: any) => ({
            ...g,
            members: Array.isArray(g.members) ? g.members.map((m: any) => (m && m.toString) ? m.toString() : String(m)) : [],
            _id: g._id?.toString ? g._id.toString() : String(g._id),
          }));
          const myGroupIds = userId ? normalizedGroups.filter(g => Array.isArray(g.members) && g.members.includes(userId)).map(g => g._id) : [];
          setUserGroupIds(myGroupIds);

          // Determine which channels the user may select for posting. Apply strict rule:
          // - Admins/mods see all channels
          // - If channel.postingMode === 'read-only' and channel.allowedPostingGroups is non-empty,
          //   only show it if user is in one of those groups or already joined.
          // - Otherwise (read-and-write) show if joined OR in allowedPostingGroups.
          const available = (data || []).filter((c: any) => {
            if (!c) return false;
            const postingMode = c.postingMode || 'read-and-write';
            const allowedGroups = Array.isArray(c.allowedPostingGroups) ? c.allowedPostingGroups.map((g: any) => (g && g.toString) ? g.toString() : String(g)) : [];
            // admins/mods can always post
            if (role === 'administrator' || role === 'moderator') return true;
            // if user already joined channel, allow
            if (c.joined) return true;

            const inAllowed = userId && myGroupIds.length && allowedGroups.some((g: string) => myGroupIds.includes(g));

            if (postingMode === 'read-only') {
              // strict: only allow if in allowed groups or joined
              return !!inAllowed;
            }

            // read-and-write: allow if in allowed groups
            return !!inAllowed;
          });

          // debug - help diagnose why channels are shown
          try { debug('PostSubmissionForm: available channels', { userId, role, myGroupIds, channelsCount: (data||[]).length, availableCount: available.length }); } catch (e) {}

          setChannels(available);
          if (available.length > 0) setSelectedChannel(available[0]._id); else setSelectedChannel(null);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // load tags whenever selectedChannel changes
  useEffect(() => {
    (async () => {
      try {
        const channelParam = selectedChannel ? `?channelId=${encodeURIComponent(selectedChannel)}` : '';
        const r = await fetch(`/api/tags${channelParam}`);
        if (r.ok) {
          const data = await r.json();
          setTags(data || []);
          if ((data || []).length > 0) setSelectedTag((data || [])[0].id);
          else setSelectedTag(null);
        }
      } catch (e) {}
    })();
  }, [selectedChannel]);

  // Keep react-hook-form in sync with selectedTag
  useEffect(() => {
    try {
      form.setValue('tagId' as any, selectedTag || undefined);
    } catch (e) {
      // ignore
    }
  }, [selectedTag]);

  const handleSubmit = async (data: PostSubmission) => {
    // Redirect to login if user is not authenticated
    if (!session?.user) {
      router.push("/login");
      return;
    }
    // Prevent submitting to a channel the client has hidden/removed for this user
    if (selectedChannel && !channels.some((c: any) => c._id === selectedChannel)) {
      notify.error('You cannot post to this channel');
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (selectedChannel) formData.append("channelId", selectedChannel);
  if (imageFile) formData.append("image", imageFile);
  if (selectedTag) formData.append('tagId', selectedTag);

      await submitPost(formData);

      form.reset();
  setImageFile(null);
  setImagePreview(null);
      notify.success("Post submitted successfully!");
    } catch (error) {
      // Don't log the full error to console (avoids exposing stack traces in the browser console)
      notify.error(error instanceof Error ? error.message : "Failed to submit post");
    }
  };

  return (
    <div className="border border-gray-200 dark:border-[#fafafa] rounded-lg p-3 bg-gray-50 dark:bg-[#dadada]/10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col w-full items-end gap-3">
          {/* Image upload (drag & drop) - moved to top */}
          <div className="w-full">
            <label className="text-sm font-medium">Image (optional)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0] ?? null;
                setImageFile(f);
                if (f) {
                  const previewUrl = URL.createObjectURL(f);
                  setImagePreview(previewUrl);
                } else {
                  setImagePreview(null);
                }
              }}
              className="mt-1 border border-dashed border-gray-300 rounded p-4 text-center hover:border-gray-400 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImageFile(f);
                  if (f) {
                    const previewUrl = URL.createObjectURL(f);
                    setImagePreview(previewUrl);
                  } else {
                    setImagePreview(null);
                  }
                }}
                className="hidden"
              />
              <div className="text-sm text-gray-500">Drag & drop an image here, or click to browse</div>
              {imagePreview && (
                <div className="mt-2">
                  <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded" />
                </div>
              )}
            </div>
          </div>

          {/* Channel selection */}
          <div className="w-full">
            <label className="text-sm font-medium">Channel</label>
            <div className="mt-1">
                <select
                  value={selectedChannel ?? ''}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full p-2 border rounded bg-white dark:bg-[#1a1a1a] border-gray-300"
                >
                  {channels.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
            </div>
            {/* joining is handled elsewhere; only show joined channels here */}
          </div>

          {/* Field: choose an existing tag (Flair) */}
          <div className="w-full">
            <label className="text-sm font-medium">Flair (choose existing)</label>
            <div className="mt-1">
              <select
                value={selectedTag ?? ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="w-full p-2 border rounded bg-white dark:bg-[#1a1a1a] border-gray-300"
              >
                <option value="">None</option>
                {tags.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag selection is rendered at the bottom as flair chips (see below) */}

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="w-full space-y-0">
                <FormLabel className="sr-only">Title</FormLabel>
                <FormControl className="w-full">
                  <Input
                    placeholder="Title*"
                    aria-label="Title"
                    {...field}
                    className="w-full shadow-none bg-white dark:bg-[#1a1a1a] border-gray-300 dark:border-[#333] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full space-y-0">
                <FormLabel className="sr-only">Description</FormLabel>
                <FormControl className="w-full">
                  <textarea
                    placeholder="Description (optional)"
                    aria-label="Description"
                    {...field}
                    className="w-full min-h-[80px] resize-vertical bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 p-2 rounded"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!selectedChannel ? (
            <div className="w-full text-sm text-red-600">You must join a channel before you can post.</div>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting || !selectedChannel}
              className="bg-gray-200 w-fit text-[#001E2B] transition-colors duration-200 hover:bg-[#00ED64] font-semibold flex items-center gap-2 shadow-none"
            >
              {isSubmitting && <Spinner size="sm" />}
              Submit
            </Button>
          )}
          {/* Moderator-only create tag UI removed — only existing tags can be chosen as flair */}
          {/* Flair chips picker removed — the select above is used to choose Flair */}
        </form>
      </Form>
    </div>
  );
}