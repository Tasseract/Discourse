import { getPosts } from "@/lib/posts";
import { getDatabase } from "@/lib/mongodb";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { canViewChannel } from '@/lib/channelAccess';
import PostCard from "./PostCard";
import { PostListPagination } from "./PostListPagination";

interface PostListServerProps {
  page?: number;
  channelId?: string | null;
  q?: string;
  sort?: string;
}

export async function PostListServer({ page = 1, channelId = null, q, sort }: PostListServerProps) {
  // If a channelId is provided in the query, show that channel's posts (viewing is allowed)
  if (channelId) {
    // support slug 'news' as a special short-hand
    const db = await getDatabase();
    const channelsCollection = db.collection('channels');
    let resolvedChannelId = channelId;
    try {
      if (channelId === 'news') {
        const news = await channelsCollection.findOne({ slug: 'news' });
        if (news) resolvedChannelId = news._id.toString();
      }
    } catch (e) {
      // ignore lookup errors and fall back to raw channelId
    }

    // enforce view permissions for private channels via helper
    const ch = await channelsCollection.findOne({ _id: new (await import('mongodb')).ObjectId(resolvedChannelId) });
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: await headers() });
      const allowed = await canViewChannel(ch, session);
      if (!allowed) {
        return (
          <div className="text-center py-8 text-gray-400">This channel is private. Join the channel to view posts.</div>
        );
      }
    } catch (e) {
      return (
        <div className="text-center py-8 text-gray-400">This channel is private. Join the channel to view posts.</div>
      );
    }

    const { posts, pagination } = await getPosts(page, 10, [resolvedChannelId], q, sort);

    if (posts.length === 0) {
      if (q && q.trim()) {
        return (
          <div className="text-center py-8 text-gray-400">{`No results for "${q}" in this channel.`}</div>
        );
      }
      return (
        <div className="text-center py-8 text-gray-400">No posts yet in this channel.</div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex flex-col">
          {posts.map((post, index) => {
            const globalIndex = (page - 1) * 10 + index + 1;
            return <PostCard key={post._id} post={post} globalIndex={globalIndex} />;
          })}
        </div>

        {pagination.totalPages > 1 && (
          <PostListPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
          />
        )}
      </div>
    );
  }

  // Determine which channels to show: user's joined channels, otherwise News
  const db = await getDatabase();
  const channelsCollection = db.collection('channels');

  let channelIds: string[] = [];
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      const userId = session.user.id;
      const joined = await channelsCollection.find({ members: userId }).toArray();
      channelIds = joined.map((c) => c._id.toString());
    }
  } catch (e) {
    // ignore
  }

  if (channelIds.length === 0) {
    // default to News channel
    const news = await channelsCollection.findOne({ slug: 'news' });
    if (news) channelIds = [news._id.toString()];
  }

  const { posts, pagination } = await getPosts(page, 10, channelIds, q, sort);

  if (posts.length === 0) {
    if (q && q.trim()) {
      return (
        <div className="text-center py-8 text-gray-400">{`No results for "${q}". Try different keywords.`}</div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-400">
        No posts yet. Be the first to submit one!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-col">
        {posts.map((post, index) => {
          const globalIndex = (page - 1) * 10 + index + 1;
          return (
            <PostCard key={post._id} post={post} globalIndex={globalIndex} />
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <PostListPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
        />
      )}
    </div>
  );
}