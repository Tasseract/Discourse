"use server";

import { unstable_cache } from "next/cache";
import { getDatabase } from "@/lib/mongodb";
import { Post, PostsResponse } from "@/lib/schemas";

async function fetchPostsFromDB(page: number = 1, limit: number = 10, channelIds?: string[], q?: string, sort?: string): Promise<PostsResponse> {
  const skip = (page - 1) * limit;

  const db = await getDatabase();
  const postsCollection = db.collection("posts");

  // Get total count for pagination
  const filter: any = {};
  if (channelIds && channelIds.length) {
    filter.channelId = { $in: channelIds };
  }

  // Exclude archived posts from normal listings
  filter.archived = { $ne: true };

  // If a search query was provided, perform a case-insensitive regex search
  if (q && q.trim()) {
    // escape regex special chars
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { submittedByName: { $regex: safe, $options: 'i' } },
    ];
  }

  const totalCount = await postsCollection.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limit);

  // determine sort order — default to newest first (most recent `submittedAt`)
  let sortObj: any = { submittedAt: -1 };
  if (sort === 'new') sortObj = { submittedAt: -1 };
  else if (sort === 'comments') sortObj = { commentsCount: -1, submittedAt: -1 };
  else if (sort === 'top') sortObj = { points: -1, submittedAt: -1 };

  const posts = await postsCollection
    .find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .toArray();

  // Convert ObjectId to string for JSON serialization
  const postsForResponse = posts.map((post) => ({
    ...post,
    _id: post._id.toString(),
    votes: post.votes || [],
    votesDown: post.votesDown || [],
    // attach tag placeholder; if post.tagId exists we'll populate below
    tag: null
  })) as any;

  // If any posts have tagId, fetch those tags and attach minimal tag info
  const tagIds: string[] = postsForResponse.map((p: any) => (p as any).tagId).filter(Boolean);
  if (tagIds.length) {
    const { ObjectId } = await import('mongodb');
    const unique: string[] = Array.from(new Set(tagIds.map((id: string) => id)));
    const tagObjs = await db.collection('tags').find({ _id: { $in: unique.map((u: string) => new ObjectId(u)) as any } as any }).toArray();
    const tagMap: Record<string, any> = {};
    tagObjs.forEach((t: any) => (tagMap[t._id.toString()] = { id: t._id.toString(), name: t.name, color: t.color || '#DDD', slug: t.slug }));
    postsForResponse.forEach((p: any) => {
      const tid = (p as any).tagId;
      if (tid && tagMap[tid]) (p as any).tag = tagMap[tid];
    });
  }

  return {
    posts: postsForResponse,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  };
}

// Cache the posts with proper tagging for revalidation
export const getPosts = unstable_cache(
  fetchPostsFromDB,
  ["posts"],
  {
    tags: ["posts"],
    revalidate: 3600, // Fallback revalidation every hour
  }
);