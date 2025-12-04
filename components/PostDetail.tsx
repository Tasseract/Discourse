"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Post } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import TagPin from './TagPin';
import BackButton from './BackButton';
// Use the votes API route instead of importing a server-only action into a client component
import { getTimeAgo } from '@/lib/utils';
import Image from 'next/image';
import logo from '@/assets/discourse.svg';
import ConfirmModal from './ConfirmModal';
import { notify } from '@/lib/notifications';

// small helper reused by PostDetail and CommentItem
function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface Props { post: Post; }

export default function PostDetail({ post }: Props) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isPending, startTransition] = useTransition();
  const [upCount, setUpCount] = useState((post.votes || []).length);
  const [downCount, setDownCount] = useState(((post as any).votesDown || []).length);
  const [hasUp, setHasUp] = useState(session?.user ? (post.votes || []).includes(session.user.id) : false);
  const [hasDown, setHasDown] = useState(session?.user ? ((post as any).votesDown || []).includes(session.user.id) : false);
  const [channelName, setChannelName] = useState<string | null>(null);

  // comments
  const [comments, setComments] = useState<Array<any>>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  // image lightbox
  const [showImage, setShowImage] = useState(false);

  const initials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  useEffect(() => {
    // load channel name
    (async () => {
      try {
        if (!post.channelId) return setChannelName('News');
        const r = await fetch('/api/channels');
        if (!r.ok) return;
        const list = await r.json();
        const ch = (list || []).find((c: any) => c._id === post.channelId || c.id === post.channelId);
        setChannelName(ch ? ch.name : post.channelId);
      } catch (e) {
        // ignore
      }
    })();

    // load comments
    (async () => {
      try {
        setLoadingComments(true);
          const r = await fetch(`/api/comments?postId=${encodeURIComponent(post._id as string)}`);
          if (!r.ok) return;
          const data = await r.json();
          // data is flat list with parentId; build tree
          const map: Record<string, any> = {};
          data.forEach((c: any) => {
            map[c.id] = { ...c, replies: [] };
          });
          const roots: any[] = [];
          data.forEach((c: any) => {
            if (c.parentId) {
              if (map[c.parentId]) map[c.parentId].replies.push(map[c.id]);
              else roots.push(map[c.id]);
            } else {
              roots.push(map[c.id]);
            }
          });
          setComments(roots || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingComments(false);
      }
    })();
  }, [post._id, post.channelId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImage) setShowImage(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showImage]);

  const handleVote = async (dir: 'up' | 'down') => {
    if (!session?.user) { router.push('/login'); return; }
    if (isPending) return;
    startTransition(async () => {
      try {
        const r = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ postId: post._id, direction: dir }),
        });
        const res: any = await r.json();
        // Server now returns upCount/downCount for reliable updates
        if (typeof res?.upCount === 'number') setUpCount(res.upCount);
        if (typeof res?.downCount === 'number') setDownCount(res.downCount);
        setHasUp(Boolean(res?.hasUpvoted));
        setHasDown(Boolean(res?.hasDownvoted));
      } catch (e) {
        console.error('vote error', e);
      }
    });
  };

  return (
    <article className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <BackButton size="sm" variant="ghost">←</BackButton>
          <div className="flex items-center gap-2">
            <div className="text-lg font-extrabold uppercase tracking-wide text-[#00684A] dark:text-[#00ED64]">{channelName ?? 'News'}</div>
            <div className="text-sm text-gray-500">▶</div>
          </div>
        </div>
      </div>

      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
              {(post as any).submittedByProfilePic ? (
                <img src={(post as any).submittedByProfilePic} alt={post.submittedByName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${(post as any).submittedByBgClass ?? 'bg-gray-100'} ${(post as any).submittedByBgClass ? `dark:${(post as any).submittedByBgClass.replace(/-100$/, '-500')}` : 'dark:bg-gray-800'}`}
                >
                  <Image src={logo} alt="logo" width={64} height={24} />
                </div>
              )}
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">{post.submittedByName}</div>
              <div className="text-sm text-gray-400">•</div>
              <div className="text-sm text-gray-500">{getTimeAgo(post.submittedAt)}</div>
            </div>
        </div>

        <h1 className="text-2xl font-semibold mt-1 leading-tight text-gray-900 dark:text-white">{post.title}</h1>
        {post.tag && <div className="mt-1"><TagPin name={post.tag.name} color={post.tag.color || '#DDD'} small={true} /></div>}
  </header>

  <div className="border-t border-gray-100 dark:border-neutral-800 my-4" />

      {post.image && (
        <div className="my-4">
          {/* Render the image inline (fit within viewport) but allow a lightbox pop-out when clicked */}
          <img
            src={`data:${post.image.contentType};base64,${post.image.data}`}
            alt={post.image.filename}
            className="w-full max-h-[60vh] object-contain rounded cursor-pointer"
            onClick={() => setShowImage(true)}
            role="button"
            aria-label="Open full image"
          />

          {showImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowImage(false)}>
              <div className="max-w-[90vw] max-h-[90vh]">
                <img
                  src={`data:${post.image.contentType};base64,${post.image.data}`}
                  alt={post.image.filename}
                  className="max-w-full max-h-full rounded shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <button
                onClick={() => setShowImage(false)}
                aria-label="Close image"
                className="absolute top-6 right-6 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <section className="mt-4 text-sm text-gray-700 dark:text-gray-300">
        {post.description}
      </section>

      {/* Low-profile votes */}
      <section className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <button onClick={() => handleVote('up')} disabled={isPending} aria-pressed={hasUp} title="Upvote" className="p-1 text-[#00684A]">
            <svg width="13" height="13" viewBox="0 0 76 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-[13px] w-[13px]"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
          </button>
          <div className="text-xs text-gray-600 tabular-nums">{upCount}</div>

          <button onClick={() => handleVote('down')} disabled={isPending} aria-pressed={hasDown} title="Downvote" className={`p-1 ${hasDown ? 'text-[#B91C1C]' : 'text-[#B91C1C]'}`}>
            <svg width="13" height="13" viewBox="0 0 76 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-[13px] w-[13px] rotate-180"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
          </button>
          <div className="text-xs text-gray-600 tabular-nums">{downCount}</div>

          <button onClick={() => post._id && router.push(`/post/${post._id}#comments`)} aria-label="View comments" className="flex items-center gap-2 p-1 ml-3 text-[#00684A] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.8-3.2A7.72 7.72 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span className="text-xs text-gray-600">{comments.length}</span>
          </button>
        </div>
      </section>

      {/* Comment field (only for signed-in users) */}
      <section className="mt-6">
        {session?.user && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!commentText.trim()) return;
            try {
              const r = await fetch('/api/comments', { method: 'POST', body: JSON.stringify({ postId: post._id, body: commentText }), headers: { 'Content-Type': 'application/json' } });
              if (!r.ok) throw new Error('Failed to post comment');
              const j = await r.json();
              if (j?.comment) {
                // new root comment: ensure replies array present and append to roots
                setComments(prev => [...prev, { ...j.comment, replies: [] }]);
                setCommentText('');
                try { router.refresh(); } catch (e) { /* ignore */ }
              }
            } catch (err) {
              console.error(err);
            }
          }} className="flex flex-col gap-2">
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="w-full border border-gray-200 dark:border-gray-700 bg-transparent rounded px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none" rows={3} />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!commentText.trim()} className={`text-sm px-4 py-1 rounded-full font-semibold ${commentText.trim() ? 'bg-[#00ED64] text-[#001E2B] hover:bg-[#58C860]' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}>Comment</button>
              <div className="text-xs text-gray-500">{comments.length} comments</div>
            </div>
          </form>
        )}
      </section>

      {/* Comment list */}
      <section id="comments" className="mt-4">
        {loadingComments ? (
          <div className="text-sm text-gray-500">Loading comments...</div>
        ) : (
          <div className="space-y-3">
            {comments.length === 0 && <div className="text-sm text-gray-500">No comments yet.</div>}
            {comments.map((c: any) => (
              <CommentItem key={c.id} comment={c} postId={post._id} onReplyAdded={(newComment: any) => {
                // append new reply to this comment
                setComments((prev) => prev.map((r) => {
                  if (r.id === c.id) return { ...r, replies: [...r.replies, newComment] };
                  return r;
                }));
              }} onCommentEdited={(id: string, body: string) => {
                setComments((prev) => prev.map((r) => r.id === id ? { ...r, body } : ({ ...r, replies: r.replies.map((rep: any) => rep.id === id ? { ...rep, body } : rep) })));
              }} onCommentDeleted={(id: string) => {
                // remove deleted comment and its replies
                setComments((prev) => prev.filter((r) => r.id !== id).map((r) => ({ ...r, replies: r.replies.filter((rep: any) => rep.id !== id) })));
              }} />
            ))}
          </div>
        )}
      </section>

    </article>
  );
}

// Subcomponent: CommentItem renders a comment with replies and controls
function CommentItem({ comment, postId, onReplyAdded, onCommentEdited, onCommentDeleted }: any) {
  const { data: session } = authClient.useSession();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [loading, setLoading] = useState(false);
  const [upCountC, setUpCountC] = useState(comment.upCount ?? 0);
  const [downCountC, setDownCountC] = useState(comment.downCount ?? 0);
  const [hasUpC, setHasUpC] = useState(Boolean(comment.hasUp));
  const [hasDownC, setHasDownC] = useState(Boolean(comment.hasDown));
  const [voting, setVoting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ postId, body: replyText, parentId: comment.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to post reply');
      onReplyAdded && onReplyAdded(j.comment);
      setReplyText('');
      setShowReply(false);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/comments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ commentId: comment.id, body: editText }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to edit');
      onCommentEdited && onCommentEdited(comment.id, editText);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleCommentVote = async (dir: 'up' | 'down') => {
    if (!session?.user) return window.location.assign('/login');
    if (voting) return;
    setVoting(true);
    try {
      const r = await fetch('/api/comment-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ commentId: comment.id, direction: dir }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Vote failed');
      if (typeof j.upCount === 'number') setUpCountC(j.upCount);
      if (typeof j.downCount === 'number') setDownCountC(j.downCount);
      setHasUpC(Boolean(j.hasUp));
      setHasDownC(Boolean(j.hasDown));
    } catch (e) {
      console.error('comment vote error', e);
    } finally { setVoting(false); }
  };

  const doDelete = async () => {
    // open modal to confirm delete
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?commentId=${encodeURIComponent(comment.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to delete');
      onCommentDeleted && onCommentDeleted(comment.id);
      notify.success('Comment deleted');
    } catch (e) {
      console.error(e);
      notify.error('Failed to delete comment');
    } finally { setLoading(false); setConfirmOpen(false); }
  };

  useEffect(() => {
    // animate entrance
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`space-y-2 transition-all duration-200 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
      <div className="flex gap-3 items-start border rounded px-3 py-2 bg-transparent">
        {comment.authorProfilePic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.authorProfilePic} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover" />
        ) : comment.authorBgClass ? (
          <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${comment.authorBgClass} dark:${comment.authorBgClass.replace(/-100$/, '-500')}`}>
            <Image src={logo} alt="logo" width={64} height={24} />
          </div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">{initials(comment.authorName)}</div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{comment.authorName}</div>
            <div className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString('en-US')}</div>
          </div>
          {!editing ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.body}</div>
          ) : (
            <div className="mt-1">
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" rows={3} />
              <div className="flex gap-2 mt-2">
                <button onClick={submitEdit} disabled={loading} className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs">Save</button>
                <button onClick={() => { setEditing(false); setEditText(comment.body); }} className="px-2 py-0.5 rounded bg-transparent text-xs">Cancel</button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs">
            {/* comment votes (small) */}
            <div className="inline-flex items-center gap-2 mr-1">
              <button onClick={() => handleCommentVote('up')} disabled={voting} aria-pressed={hasUpC} title="Upvote comment" className={`p-1 transform transition-all duration-150 active:scale-95 ${hasUpC ? 'text-[#00684A]' : 'text-gray-400 hover:text-[#00684A]'}`}>
                <svg width="12" height="12" viewBox="0 0 76 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-[12px] w-[12px]"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
              </button>
              <div className="text-xs text-gray-600 tabular-nums">{upCountC}</div>
              <button onClick={() => handleCommentVote('down')} disabled={voting} aria-pressed={hasDownC} title="Downvote comment" className={`p-1 transform transition-all duration-150 active:scale-95 ${hasDownC ? 'text-[#B91C1C]' : 'text-[#B91C1C]'}`}>
                <svg width="12" height="12" viewBox="0 0 76 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-[12px] w-[12px] rotate-180"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
              </button>
              <div className="text-xs text-gray-600 tabular-nums">{downCountC}</div>
            </div>
            {session?.user && (
              <button onClick={() => setShowReply((s) => !s)} aria-label="Reply" title="Reply" className="text-gray-400 hover:text-[#00684A] p-1 transform transition-all duration-150 hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.8-3.2A7.72 7.72 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </button>
            )}
            {session?.user?.id === comment.authorId && !editing && (
              <>
                <button onClick={() => setEditing(true)} className="text-gray-500">Edit</button>
                <button onClick={doDelete} className="text-red-600">Delete</button>
              </>
            )}
          </div>
          {showReply && (
            <div className="mt-2 transition-opacity duration-150 ease-out">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full border border-gray-100 dark:border-neutral-800 bg-transparent rounded px-2 py-1 text-sm placeholder-gray-400" rows={2} />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={submitReply} disabled={loading || !replyText.trim()} className="text-xs text-[#00684A] font-semibold px-2 py-0.5">Reply</button>
                <button onClick={() => { setShowReply(false); setReplyText(''); }} className="text-xs text-gray-500">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-10 mt-2 space-y-2">
          {comment.replies.map((r: any) => (
            <CommentItem key={r.id} comment={r} postId={postId} onReplyAdded={(nc: any) => {
              // propagate up
            }} onCommentEdited={onCommentEdited} onCommentDeleted={onCommentDeleted} />
          ))}
        </div>
      )}
      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          title="Delete comment"
          description={<span>Are you sure you want to delete this comment? This action cannot be undone.</span>}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={performDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
