import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET: list channels, ensure 'news' exists
// POST: { action: 'join'|'create', channelId?, name?, description?, category? }
export async function GET(req: Request) {
  try {
    const db = await getDatabase();
    const channelsCollection = db.collection('channels');

    // NOTE: previously this endpoint automatically created a 'news' channel when missing.
    // That behavior has been removed so administrators can delete the news channel from the DB
    // without it being re-created automatically.

    // Get session to mark joined
    let session = null;
    try {
      const auth = await getAuth();
      session = await auth.api.getSession({ headers: await headers() });
    } catch (e) {
      session = null;
    }

    const all = await channelsCollection.find({}).toArray();
    const userId = session?.user?.id;

    // determine requester role so admins can receive extra fields (like pendingModerators list)
    let requesterRole: string | null = null;
    try {
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      requesterRole = session ? await resolveRoleFromSession(session) : null;
    } catch (e) {
      requesterRole = null;
    }

    // include channel type in responses; default missing types to 'public'
    const mapped = all.map((c) => {
      const type = c.type || 'public';
      const postingMode = c.postingMode || 'read-and-write';
      return {
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        type,
        postingMode,
        allowedPostingGroups: c.allowedPostingGroups || [],
        isPrivate: type === 'private',
        // legacy: `isGlobal` removed; treat `news` by slug when special-casing on the server
        joined: userId ? (c.members || []).includes(userId) : false,
        isModerator: userId ? (c.moderators || []).includes(userId) : false,
        // boolean flag indicating whether *this user* has a pending moderator application
        pendingModerator: userId ? (c.pendingModerators || []).includes(userId) : false,
        // for administrators only, expose the full pendingModerators array so admin UIs can list applicants
        pendingModerators: requesterRole === 'administrator' ? (c.pendingModerators || []) : undefined,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const channelId = body.channelId;

    const db = await getDatabase();
    const channelsCollection = db.collection('channels');

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    if (action === 'join') {
      if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

      const type = ch.type || 'public';
      // require passkey if the channel is private OR a hashedPasskey exists on the channel record
      if (type === 'private' || ch.hashedPasskey) {
        const provided = typeof body.passkey === 'string' ? body.passkey : '';
        if (!provided) return NextResponse.json({ error: 'Passkey required for private channel' }, { status: 400 });
        const { createHash } = await import('crypto');
        const hashed = createHash('sha256').update(provided).digest('hex');
        if (!ch.hashedPasskey || ch.hashedPasskey !== hashed) {
          return NextResponse.json({ error: 'Invalid passkey' }, { status: 403 });
        }
      }

      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $addToSet: { members: userId } });
      return NextResponse.json({ success: true });
    }

    // allow a member to leave a channel
    if (action === 'leave') {
      
      if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      // remove the user from members
      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $pull: { members: userId } } as any);
      return NextResponse.json({ success: true });
    }

    // moderators can apply to be channel moderators (their application must be approved by an admin or moderator)
    if (action === 'apply-moderator') {
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);
      // only users with role 'moderator' can apply to be channel moderators
      if (role !== 'moderator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      // add to pendingModerators if not already moderator or pending
      const alreadyMod = (ch.moderators || []).includes(userId);
      const alreadyPending = (ch.pendingModerators || []).includes(userId);
      if (alreadyMod) return NextResponse.json({ error: 'Already a moderator' }, { status: 400 });
      if (alreadyPending) return NextResponse.json({ success: true });
      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $addToSet: { pendingModerators: userId } });
      return NextResponse.json({ success: true });
    }

    // approve a moderator application (admin or moderator can approve)
    if (action === 'approve-moderator') {
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const approverRole = await resolveRoleFromSession(session);
      let allowedApprover = (approverRole === 'administrator' || approverRole === 'moderator');
      const applicantId = body.applicantId;
      if (!allowedApprover) {
        // allow group-based moderators for this channel
        try {
          const { isChannelModerator } = await import('@/lib/channelAccess');
          const { ObjectId } = await import('mongodb');
          const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
          if (ch) {
            allowedApprover = await isChannelModerator(ch, session.user.id);
          }
        } catch (e) {
          // ignore
        }
      }
      if (!allowedApprover) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const approverId = session?.user?.id;
      // prevent approving your own application
      if (approverId && applicantId && approverId === applicantId) {
        return NextResponse.json({ error: 'Cannot approve your own application' }, { status: 403 });
      }
      if (!channelId || !applicantId) return NextResponse.json({ error: 'Missing channelId or applicantId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      // remove from pending and add to moderators
      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $pull: { pendingModerators: applicantId } });
      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $addToSet: { moderators: applicantId } });
      // log activity: approver approved applicant
      try {
        const { logActivity } = await import('@/lib/logActivity');
        await logActivity(approverId || 'system', 'moderator.approved', 'moderator', `Approved ${applicantId} for channel ${channelId}`, { channelId, applicantId, approverId });
      } catch (e) {
        // best-effort
      }
      return NextResponse.json({ success: true });
    }

    // reject (deny) a moderator application
    if (action === 'reject-moderator') {
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const approverRole = await resolveRoleFromSession(session);
      let allowedApprover = (approverRole === 'administrator' || approverRole === 'moderator');
      const applicantId = body.applicantId;
      if (!allowedApprover) {
        try {
          const { isChannelModerator } = await import('@/lib/channelAccess');
          const { ObjectId } = await import('mongodb');
          const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
          if (ch) {
            allowedApprover = await isChannelModerator(ch, session.user.id);
          }
        } catch (e) {
          // ignore
        }
      }
      if (!allowedApprover) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!channelId || !applicantId) return NextResponse.json({ error: 'Missing channelId or applicantId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      // remove from pendingModerators
      await channelsCollection.updateOne({ _id: new ObjectId(channelId) }, { $pull: { pendingModerators: applicantId } });
      // log activity: approver rejected applicant
      try {
        const { logActivity } = await import('@/lib/logActivity');
        const approverId = session?.user?.id || null;
        await logActivity(approverId || 'system', 'moderator.rejected', 'moderator', `Rejected ${applicantId} for channel ${channelId}`, { channelId, applicantId, approverId });
      } catch (e) {
        // best-effort
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      // Only admins can create channels
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);
      if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const name = body.name;
      const description = body.description || '';
      const category = body.category || 'community';
      const sortIndex = typeof body.sortIndex === 'number' ? body.sortIndex : 0;
      const slug = (name || 'channel').toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // channel type support: 'public' | 'private'
      const type = body.type === 'private' ? 'private' : 'public';
      let hashedPasskey: string | undefined = undefined;
      if (type === 'private') {
        const provided = typeof body.passkey === 'string' ? body.passkey : '';
        if (!provided) return NextResponse.json({ error: 'Passkey required for private channel' }, { status: 400 });
        const { createHash } = await import('crypto');
        hashedPasskey = createHash('sha256').update(provided).digest('hex');
      }

      const res = await channelsCollection.insertOne({
        name,
        slug,
        description,
        members: [],
        moderators: [],
        pendingModerators: [],
        category,
        sortIndex,
        type,
        hashedPasskey,
        allowedPostingGroups: Array.isArray(body.allowedPostingGroups) ? body.allowedPostingGroups : [],
        postingMode: body.postingMode === 'read-only' ? 'read-only' : 'read-and-write',
        createdAt: new Date(),
        createdById: userId,
      });
      return NextResponse.json({ success: true, channelId: res.insertedId.toString() });
    }

    if (action === 'update') {
      // Admin-only: update category / sortIndex for a channel
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);
      if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
      const update: any = {};
      // allow updating category / sortIndex (existing) and also name/description (new)
      if (typeof body.category === 'string') update.category = body.category;
      if (typeof body.sortIndex === 'number') update.sortIndex = body.sortIndex;
      if (typeof body.name === 'string' && body.name.trim()) {
        update.name = body.name.trim();
        // update slug to a slugified version of the name
        const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (slug) update.slug = slug;
      }
      if (typeof body.description === 'string') update.description = body.description;
      if (Array.isArray(body.allowedPostingGroups)) update.allowedPostingGroups = body.allowedPostingGroups;
      if (typeof body.postingMode === 'string') update.postingMode = body.postingMode === 'read-only' ? 'read-only' : 'read-and-write';
      if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      let objId: any;
      try {
        objId = new ObjectId(channelId);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
      }

      // If we're changing the slug (via name), ensure no other channel already uses it
      if (update.slug) {
        const existing = await channelsCollection.findOne({ slug: update.slug });
        if (existing && existing._id.toString() !== channelId) {
          return NextResponse.json({ error: 'Slug already in use by another channel' }, { status: 409 });
        }
      }

      const res = await channelsCollection.updateOne({ _id: objId }, { $set: update });
      if (res.matchedCount === 0) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }

      // return the updated channel for client-side refresh
      const updated = await channelsCollection.findOne({ _id: objId });
      const mapped = updated
        ? {
            _id: updated._id.toString(),
            name: updated.name,
            slug: updated.slug,
            description: updated.description,
            category: updated.category,
          }
        : null;

      return NextResponse.json({ success: true, channel: mapped });
    }

    // Admin-only: delete a channel
    if (action === 'delete') {
      const { resolveRoleFromSession } = await import('@/lib/getRole');
      const role = await resolveRoleFromSession(session);
      if (role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
      const { ObjectId } = await import('mongodb');
      const ch = await channelsCollection.findOne({ _id: new ObjectId(channelId) });
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      // Prevent deleting the main news channel accidentally
      if (ch.slug === 'news') {
        // Protected: provide guidance to run the one-off script if they really want to remove it
        return NextResponse.json({ error: 'Cannot delete news channel. To remove it run the one-off script ./scripts/delete-news.mjs after taking a backup.' }, { status: 400 });
      }
      await channelsCollection.deleteOne({ _id: new ObjectId(channelId) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
