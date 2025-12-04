"use client";

import { useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Post, OptimisticVote } from "@/lib/schemas";
import { voteOnPost } from "@/lib/actions";
import { getTimeAgo } from "@/lib/utils";
import TagPin from './TagPin';
import { error as logError } from '@/lib/logger';
import ConfirmModal from './ConfirmModal';
import { notify } from '@/lib/notifications';

interface PostCardProps {
  post: Post;
  globalIndex?: number;
}

export default function PostCard({ post }: PostCardProps) {
  const { data: session } = authClient.useSession();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initialVoteData: OptimisticVote = {
    points: post.points,
    hasUpvoted: session?.user ? (post.votes || []).includes(session.user.id) : false,
    hasDownvoted: session?.user ? (post as any).votesDown?.includes(session.user.id) : false,
    upCount: (post.votes || []).length,
    downCount: ((post as any).votesDown || []).length,
  };

  const [optimisticVote, addOptimisticVote] = useOptimistic(
    initialVoteData,
    (_state, newVote: OptimisticVote) => newVote
  );

  const handleUp = () => {
    if (isPending) return;
    if (!session?.user) { router.push('/login'); return; }
    startTransition(async () => {
      const currentlyUp = optimisticVote.hasUpvoted;
      const currentlyDown = optimisticVote.hasDownvoted;
      const upCount = optimisticVote.upCount + (currentlyUp ? -1 : 1);
      const downCount = optimisticVote.downCount + (currentlyDown ? -1 : 0);
      addOptimisticVote({
        ...optimisticVote,
        hasUpvoted: !currentlyUp,
        hasDownvoted: false,
        upCount,
        downCount,
        points: upCount - downCount,
      });

      try {
        if (!post._id) return;
        await voteOnPost(post._id, 'up');
      } catch (e) {
        logError('Error upvoting', e);
      }
    });
  };

  const handleDown = () => {
    if (isPending) return;
    if (!session?.user) { router.push('/login'); return; }
    startTransition(async () => {
      const currentlyDown = optimisticVote.hasDownvoted;
      const currentlyUp = optimisticVote.hasUpvoted;
      const downCount = optimisticVote.downCount + (currentlyDown ? -1 : 1);
      const upCount = optimisticVote.upCount + (currentlyUp ? -1 : 0);
      addOptimisticVote({
        ...optimisticVote,
        hasDownvoted: !currentlyDown,
        hasUpvoted: false,
        upCount,
        downCount,
        points: upCount - downCount,
      });

      try {
        if (!post._id) return;
        await voteOnPost(post._id, 'down');
      } catch (e) {
        logError('Error downvoting', e);
      }
    });
  };

  const handleArchive = () => {
    // open modal instead
    setConfirmOpen(true);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const doConfirmArchive = () => {
    if (isPending) return;
    if (!session?.user) { router.push('/login'); return; }
    if (!post._id) return;

    setConfirmOpen(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/posts/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post._id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          logError('Failed to archive post', json);
          notify.error(json?.error || 'Failed to archive post');
          return;
        }
        notify.success('Post archived');
        router.refresh();
      } catch (e) {
        logError('Error archiving post', e);
        notify.error('Network error');
      }
    });
  };

  return (
    <div className="w-full mb-4">
      <article className="relative w-full bg-white/60 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 overflow-hidden">
        {session?.user?.id === post.submittedById && (
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="absolute top-3 right-3 p-1 text-red-600 hover:text-red-700 rounded"
            aria-label="Delete post (archive)"
            title="Delete post"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex flex-row gap-3 items-start">
          <div className="flex flex-col min-w-0 gap-2 w-full">
            <div className="text-xs text-gray-500">{post.submittedByName} • {getTimeAgo(post.submittedAt)}</div>

            {post.image && (
              <div className="">
                <img src={`data:${post.image.contentType};base64,${post.image.data}`} alt={post.image.filename} className="w-full max-h-48 object-cover rounded" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <h3 onClick={() => post._id && router.push(`/post/${post._id}`)} className="font-semibold text-lg cursor-pointer text-gray-900 dark:text-white m-0">{post.title}</h3>
              {post.tag && (
                <div onClick={() => post._id && router.push(`/post/${post._id}`)} className="cursor-pointer">
                  {/* Use the small variant for posts to make the flair a bit smaller */}
                  <TagPin name={post.tag.name} color={post.tag.color || '#DDD'} small={true} />
                </div>
              )}
            </div>

            {post.description && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {post.description.length > 250 ? `${post.description.slice(0, 250)}...` : post.description}
              </div>
            )}

            {post.description && post.description.length > 250 && (
              <div className="m">
                <button className="text-sm text-[#00684A] font-medium" onClick={() => post._id && router.push(`/post/${post._id}`)}>Read more</button>
              </div>
            )}

            {/* Flair is shown beside the title; remove duplicate small flair below the description */}

            <div className="flex items-center justify-between gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-3">
                <button onClick={handleUp} disabled={isPending} className="p-1 text-[#00684A]" aria-label="Upvote">
                  <svg width="16" height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[13px] w-[13px]"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" /></svg>
                </button>
                <div className="text-xs text-gray-600">{optimisticVote.upCount}</div>
                <button onClick={handleDown} disabled={isPending} className={`p-1 ${optimisticVote.hasDownvoted ? 'text-[#B91C1C]' : 'text-[#B91C1C]'}`} aria-label="Downvote">
                  <svg width="16" height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[13px] w-[13px] rotate-180"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" /></svg>
                </button>
                <div className="text-xs text-gray-600">{optimisticVote.downCount}</div>

                <button
                  onClick={() => post._id && router.push(`/post/${post._id}`)}
                  aria-label="View comments"
                  className="flex items-center gap-2 p-1 ml-3 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  {/* Larger comment / chat bubble icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.8-3.2A7.72 7.72 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {/* Comment count (fallback to 0 if not available on the post) */}
                  <span className="text-xs text-gray-600">{(post as any).commentsCount ?? 0}</span>
                </button>
                {/* owner-only archive button moved to top-right */}
              </div>

              <div />
            </div>
          </div>
        </div>
      </article>
      <ConfirmModal
        open={confirmOpen}
        title="Delete post"
        description={
          <>
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{post.title}</strong>? This will archive the post and hide it from listings. Administrators can permanently remove it from the database.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={doConfirmArchive}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
