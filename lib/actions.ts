"use server";

import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { getAuth } from "@/lib/auth";
import { debug, info, warn, error } from "@/lib/logger";
import { PostSubmissionSchema, SubmitPostResult, VoteResult } from "@/lib/schemas";
import { ObjectId } from "mongodb";

export async function submitPost(formData: FormData): Promise<SubmitPostResult> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

  const title = (formData.get("title") as string) || "";
  const description = (formData.get("description") as string) || undefined;
  const channelId = (formData.get("channelId") as string) || undefined;

  // Image file (optional)
  const imageFile = formData.get("image") as File | null;
  const tagId = (formData.get("tagId") as string) || undefined;

  const validatedData = PostSubmissionSchema.parse({ title, description, channelId, image: imageFile });

    const db = await getDatabase();
    const postsCollection = db.collection("posts");

    // Validate channel membership and posting rights
    let targetChannel: any = null;
    if (validatedData.channelId) {
      const { ObjectId } = await import('mongodb');
      targetChannel = await db.collection('channels').findOne({ _id: new ObjectId(validatedData.channelId) });
      if (!targetChannel) {
        throw new Error('Channel not found');
      }

      // Normalize stored ids to strings to avoid mismatches between ObjectId and string
      try {
        targetChannel.allowedPostingGroups = (targetChannel.allowedPostingGroups || []).map((g: any) => (g && g.toString) ? g.toString() : String(g));
      } catch (e) { targetChannel.allowedPostingGroups = targetChannel.allowedPostingGroups || []; }
      try {
        targetChannel.members = (targetChannel.members || []).map((m: any) => (m && m.toString) ? m.toString() : String(m));
      } catch (e) { targetChannel.members = targetChannel.members || []; }

      // Determine posting mode and resolve the requester's role for permission checks
      const postingMode = (targetChannel.postingMode as string) || 'read-and-write';
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);

      // If channel is the News channel (slug === 'news'), only admins and moderators can post
      if (targetChannel.slug === 'news' && !(role === 'administrator' || role === 'moderator')) {
        throw new Error('Only admins and moderators can post to News');
      }

      // Helper to check whether the current user belongs to any of the channel's allowedPostingGroups
      const isInAllowedGroup = async () => {
        try {
          if (!targetChannel.allowedPostingGroups || !Array.isArray(targetChannel.allowedPostingGroups) || targetChannel.allowedPostingGroups.length === 0) return false;
          const { getUserGroups } = await import('@/lib/groups');
          // fetch groups that the user is a member of (DB does the filtering)
          const userGroups = await getUserGroups(session.user.id);
          if (!Array.isArray(userGroups) || userGroups.length === 0) return false;
          const userGroupIds = userGroups.map((g: any) => (g && g._id) ? g._id.toString() : String(g._id));
          // normalize allowedPostingGroups to strings and check intersection
          const allowed = (targetChannel.allowedPostingGroups || []).map((g: any) => (g && g.toString) ? g.toString() : String(g));
          for (const gid of allowed) {
            if (userGroupIds.includes(gid)) return true;
          }
          return false;
          } catch (e) {
          warn('isInAllowedGroup check failed:', e);
          return false;
        }
      };

      if (postingMode === 'read-only') {
        // Only users in the configured groups (or admins/moderators) can post. Channel visibility remains public.
        const roleIsAdminOrMod = (role === 'administrator' || role === 'moderator');
        let ok = false;
        if (!roleIsAdminOrMod) {
          ok = await isInAllowedGroup();
        }
        // Diagnostic logging to help track misconfigured channels or unexpected behavior
        try {
          debug('submitPost: postingMode check', {
            channelId: targetChannel._id?.toString?.(),
            postingMode,
            allowedPostingGroups: targetChannel.allowedPostingGroups,
            role,
            roleIsAdminOrMod,
            inAllowedGroup: ok,
            userId: session.user.id,
          });
        } catch (e) { /* ignore logging errors */ }

        if (!roleIsAdminOrMod && !ok) {
          throw new Error('You are not in a group allowed to post in this channel');
        }
      } else {
        // read-and-write (default): group members OR joined channel members can post.
        if (role === 'administrator' || role === 'moderator') {
          // admins/mods bypass checks
        } else if (await isInAllowedGroup()) {
          // users in an allowed group can post regardless of membership
        } else {
          // otherwise require channel membership (except News which is handled above)
          if (targetChannel.slug !== 'news') {
            const members = targetChannel.members || [];
            if (!members.includes(session.user.id)) {
              throw new Error('You must join this channel before posting');
            }
          }
        }
      }
    } else {
      // If no channelId provided, default to News channel.
      // Previously the code created a missing 'news' channel automatically. That behavior
      // is intentionally removed so the channel can be managed/deleted via the database.
      const channelsCollection = db.collection('channels');
      const news = await channelsCollection.findOne({ slug: 'news' });
      if (!news) {
        throw new Error("News channel not found. It must exist in the database to post without specifying a channel.");
      }
      targetChannel = news;
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role2 = await resolveRoleFromSession(session);
      if (!(role2 === 'administrator' || role2 === 'moderator')) {
        throw new Error('Only admins and moderators can post to News');
      }
    }

    // If an image file was provided, convert to base64 and validate size/type
    let imageObj: { filename: string; contentType: string; data: string } | undefined;
    if (imageFile && (imageFile as any).size > 0) {
      // Enforce a reasonable size limit (5MB)
      const MAX_BYTES = 5 * 1024 * 1024;
      const size = (imageFile as any).size as number;
      if (size > MAX_BYTES) {
        throw new Error("Image is too large. Maximum size is 5MB.");
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const base64 = buffer.toString("base64");
      imageObj = {
        filename: imageFile.name,
        contentType: imageFile.type || "application/octet-stream",
        data: base64,
      };
    }

    // Validate tagId (if provided): must exist and must be global or match the target channel
    if (tagId) {
      try {
        const tag = await db.collection('tags').findOne({ _id: new ObjectId(tagId) });
        if (!tag) throw new Error('Tag not found');
        const tagChannelId = tag.channelId ?? null;
        const postChannelId = targetChannel?._id?.toString?.() ?? null;
        // If tag is scoped to a different channel, reject
        if (tagChannelId && postChannelId && tagChannelId !== postChannelId) {
          throw new Error('Selected tag is not valid for this channel');
        }
      } catch (e) {
        // Normalize invalid ObjectId or other errors into a friendly message
        throw new Error(e instanceof Error ? e.message : 'Invalid tag');
      }
    }

    const newPost: any = {
      title: validatedData.title,
      description: validatedData.description,
      tagId: tagId,
      channelId: targetChannel?._id?.toString?.(),
      image: imageObj,
      points: 1,
      submittedById: session.user.id,
      submittedByName: session.user.name,
      submittedAt: new Date(),
      votes: [session.user.id]
    };

    const res = await postsCollection.insertOne(newPost);

    // Log activity (best-effort)
    try {
      const { logActivity } = await import('./logActivity');
      await logActivity(session.user.id, 'post.created', 'post', newPost.title ?? '', { postId: res.insertedId.toString() });
    } catch (e) {
      // ignore logging errors
    }

    // Revalidate the posts cache
    revalidateTag("posts");

    return { success: true };
  } catch (err) {
    error(err);
    throw new Error(err instanceof Error ? err.message : "Failed to submit post");
  }
}

export async function voteOnPost(postId: string, direction: 'up' | 'down'): Promise<VoteResult> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDatabase();
    const postsCollection = db.collection("posts");

    const post = await postsCollection.findOne({ 
      _id: new ObjectId(postId) 
    });

    if (!post) {
      throw new Error("Post not found");
    }

    const userId = session.user.id;
    const upVotes = (post.votes as string[]) || [];
    const downVotes = (post.votesDown as string[]) || [];

    const hasUp = upVotes.includes(userId);
    const hasDown = downVotes.includes(userId);

    // Update lists based on direction
    if (direction === 'up') {
      if (hasUp) {
        // remove upvote
        const newUp = upVotes.filter((id) => id !== userId);
        // replace
        await postsCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { votes: newUp, points: newUp.length - downVotes.length } });
        revalidateTag("posts");
        return { points: newUp.length - downVotes.length, hasUpvoted: false, hasDownvoted: hasDown, upCount: newUp.length, downCount: downVotes.length } as any;
      } else {
        // add upvote and remove from down if present
        const newUp = [...upVotes, userId];
        const newDown = downVotes.filter((id) => id !== userId);
        await postsCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { votes: newUp, votesDown: newDown, points: newUp.length - newDown.length } });
        revalidateTag("posts");
        return { points: newUp.length - newDown.length, hasUpvoted: true, hasDownvoted: false, upCount: newUp.length, downCount: newDown.length } as any;
      }
    } else {
      // direction === 'down'
      if (hasDown) {
        const newDown = downVotes.filter((id) => id !== userId);
        await postsCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { votesDown: newDown, points: upVotes.length - newDown.length } });
        revalidateTag("posts");
        return { points: upVotes.length - newDown.length, hasUpvoted: hasUp, hasDownvoted: false, upCount: upVotes.length, downCount: newDown.length } as any;
      } else {
        const newDown = [...downVotes, userId];
        const newUp = upVotes.filter((id) => id !== userId);
        await postsCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { votes: newUp, votesDown: newDown, points: newUp.length - newDown.length } });
        revalidateTag("posts");
        return { points: newUp.length - newDown.length, hasUpvoted: false, hasDownvoted: true, upCount: newUp.length, downCount: newDown.length } as any;
      }
    }

  } catch (err) {
    error(err);
    throw new Error(err instanceof Error ? err.message : "Failed to vote on post");
  }
}