"use client";

// Lightweight compatibility wrapper.
// The project now uses `PostCard` as the per-post client component. Keep
// `PostItem` as a tiny wrapper that forwards props to `PostCard` so any
// remaining imports of `PostItem` keep working during the transition.

import PostCard from "./PostCard";
import type { Post } from "@/lib/schemas";

interface PostItemProps {
  post: Post;
  globalIndex?: number;
}

export function PostItem({ post, globalIndex }: PostItemProps) {
  return <PostCard post={post} globalIndex={globalIndex} />;
}

export default PostItem;
