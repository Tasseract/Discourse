import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Post } from '@/lib/schemas';
import PostDetail from '../../../components/PostDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">Post not found</h2>
        <p className="text-sm text-gray-500">No post id provided in the route.</p>
      </div>
    );
  }
  const db = await getDatabase();
  const { ObjectId: O } = await import('mongodb');
  let postDoc = null;
  try {
    postDoc = await db.collection('posts').findOne({ _id: new O(id) });
  } catch (e) {
    // invalid id format or DB error — treat as not found
    postDoc = null;
  }
  if (!postDoc) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">Post not found</h2>
        <p className="text-sm text-gray-500">The post you're looking for does not exist.</p>
      </div>
    );
  }

  // attach tag if exists
  let tag = null;
  if (postDoc.tagId) {
    try {
      const t = await db.collection('tags').findOne({ _id: new O(postDoc.tagId) });
      if (t) tag = { id: t._id.toString(), name: t.name, color: t.color || '#DDD', slug: t.slug };
    } catch (e) {
      // ignore
    }
  }

  // attach poster profile (profilePicUrl) if available
  let posterProfilePic: string | undefined = undefined;
  let posterBgClass: string | undefined = undefined;
  try {
    const prof = await db.collection('profiles').findOne({ userId: postDoc.submittedById });
    if (prof && prof.profilePicUrl) posterProfilePic = prof.profilePicUrl;
    if (prof && prof.bgClass) posterBgClass = prof.bgClass;
  } catch (e) {
    // ignore
  }

  const post: Post = {
    ...postDoc,
    _id: postDoc._id.toString(),
    submittedAt: postDoc.submittedAt instanceof Date ? postDoc.submittedAt : new Date(postDoc.submittedAt),
    votes: postDoc.votes || [],
    // attach votesDown if present
    // @ts-ignore
    votesDown: postDoc.votesDown || [],
    tag: tag ?? undefined,
    // include profile pic URL and bgClass if available (used by client PostDetail)
    submittedByProfilePic: posterProfilePic,
    submittedByBgClass: posterBgClass,
  } as any;

  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat flex min-h-screen flex-col justify-center">
      <div className="mx-auto flex w-full max-w-full md:max-w-md flex-1 flex-col sm:p-3 sm:px-5 md:px-0 lg:max-w-xl backdrop-blur-xs bg-white/50 dark:bg-black/30 dark:border-white">
        <main className="mt-2 flex flex-1 flex-col w-full">
          <div className="px-4 flex-1">
            <div className="max-w-3xl mx-auto p-6">
              {/* render client component for interactivity */}
              <PostDetail post={post} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
