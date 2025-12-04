import { getDatabase } from "@/lib/mongodb";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import ChannelJoinButton from "./ChannelJoinButton";
import Link from 'next/link';
import ModeratorApplyButton from "./ModeratorApplyButton";
import ApproveModeratorButton from "./ApproveModeratorButton";

const CATEGORY_ORDER = [
  "academics",
  "community",
  "campus-services",
  "colleges",
  "social",
];

const CATEGORY_LABELS: Record<string, string> = {
  academics: "Academics",
  community: "Community",
  "campus-services": "Campus Services",
  colleges: "Colleges",
  social: "Social",
};

import { UserRole } from '@/lib/roles';
import canViewChannel from '@/lib/channelAccess';
import * as groupsLib from '@/lib/groups';

export default async function ChannelsList() {
  const db = await getDatabase();
  const channelsCollection = db.collection('channels');

  let session = null;
  try {
    const auth = await getAuth();
    session = await auth.api.getSession({ headers: await headers() });
  } catch (e) {
    session = null;
  }

  const all = await channelsCollection.find({}).toArray();
  const userId = session?.user?.id;
  // resolve role reliably (may require DB lookup)
  const { resolveRoleFromSession } = await import("@/lib/getRole");
  const userRole = session ? await resolveRoleFromSession(session) : UserRole.GUEST;

  // normalize channels
  const mapped = all.map((c: any) => {
    const category = c.category || 'community';
    const type = c.type || 'public';
    return {
      _id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      type,
         createdById: c.createdById || null,
       hashedPasskey: c.hashedPasskey || null,
      isPrivate: type === 'private',
      joined: userId ? (c.members || []).includes(userId) : false,
      isModerator: userId ? (c.moderators || []).includes(userId) : false,
      pendingModerator: userId ? (c.pendingModerators || []).includes(userId) : false,
      category,
      sortIndex: typeof c.sortIndex === 'number' ? c.sortIndex : 0,
      moderators: c.moderators || [],
      pendingModerators: c.pendingModerators || [],
    };
  });

  // split joined vs others
  const joinedChannels = mapped.filter((m) => m.joined).sort((a, b) => a.name.localeCompare(b.name));
  // filter out channels the user cannot post to when they're read-only and have allowedPostingGroups
  const otherChannels = mapped.filter((m) => {
    if (m.joined) return false;
    try {
      const postingMode = (m as any).postingMode || 'read-and-write';
      const allowed = Array.isArray((m as any).allowedPostingGroups) ? (m as any).allowedPostingGroups.map((x:any) => x?.toString?.() ?? x) : [];
      // admins/mods see all
      if (isGlobalPrivileged) return true;
      // if not read-only or no allowed groups, show the channel
      if (postingMode !== 'read-only' || allowed.length === 0) return true;
      // if user is in any allowed group, show
      const userIdStr = userId;
      if (userIdStr && Array.isArray(userGroups) && userGroups.length) {
        const myGroupIds = userGroups.map((g:any) => g._id?.toString?.() ?? g._id);
        if (myGroupIds.some((id:string) => allowed.includes(id))) return true;
      }
      // otherwise hide
      return false;
    } catch (e) {
      return true;
    }
  });

  // compute canView for each channel efficiently: fetch user groups once
  const canViewLookup: Record<string, boolean> = {};
  let userGroups: any[] = [];
  if (userId) {
    try {
      userGroups = await groupsLib.getUserGroups(userId);
    } catch (e) {
      userGroups = [];
    }
  }

  const isGlobalPrivileged = (userRole === UserRole.ADMINISTRATOR || userRole === UserRole.MODERATOR);
  for (const ch of mapped) {
    try {
      const isPrivate = ch.type === 'private' || !!ch.hashedPasskey;
      if (!isPrivate) {
        canViewLookup[ch._id] = true;
        continue;
      }
      if (!userId) {
        canViewLookup[ch._id] = false;
        continue;
      }
      if (ch.joined) {
        canViewLookup[ch._id] = true;
        continue;
      }
      if (isGlobalPrivileged) {
        canViewLookup[ch._id] = true;
        continue;
      }
      let ok = false;
      if (Array.isArray(userGroups) && userGroups.length > 0) {
        const chId = ch._id?.toString?.() ?? ch._id;
        for (const g of userGroups) {
          const canView = (g.canViewChannels || []).map((x: any) => x?.toString?.() ?? x);
          if (canView.includes(chId) || canView.includes(ch.slug)) { ok = true; break; }
        }
      }
      canViewLookup[ch._id] = !!ok;
    } catch (e) {
      canViewLookup[ch._id] = false;
    }
  }

  // group others by category and sort within by sortIndex then name
  const grouped: Record<string, any[]> = {};
  for (const ch of otherChannels) {
    const cat = CATEGORY_ORDER.includes(ch.category) ? ch.category : 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ch);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => {
      if ((a.sortIndex || 0) !== (b.sortIndex || 0)) return (a.sortIndex || 0) - (b.sortIndex || 0);
      return a.name.localeCompare(b.name);
    });
  }

  return (
    <div className="py-4 ">
      <h2 className="text-lg font-semibold mb-3">Channels</h2>

      {/* Joined always on top */}
      {joinedChannels.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Joined</div>
          <div className="space-y-2">
            {joinedChannels.map((ch) => {
              const canView = canViewLookup[ch._id] || false;
              return (
                <div key={ch._id} className="border rounded p-3 flex items-start justify-between bg-white/60 dark:bg-black/30">
                  {canView ? (
                    <Link href={`/?channel=${encodeURIComponent(ch._id)}`} className="flex-1 min-w-0">
                      <div>
                        <div className="font-medium truncate">{ch.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{ch.description}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div>
                        <div className="font-medium truncate">{ch.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{ch.description}</div>
                      </div>
                    </div>
                  )}
                  <div className="ml-4 flex items-center gap-2">
                    <ChannelJoinButton channelId={ch._id} initiallyJoined={true} isPrivate={ch.isPrivate} />
                    {/* moderators can apply to moderate even if joined; show apply button if they're a moderator-role and not already moderator/pending */}
                    {userRole === UserRole.MODERATOR && !ch.isModerator && !ch.pendingModerator && (
                      <ModeratorApplyButton channelId={ch._id} />
                    )}
                    {ch.pendingModerators && ch.pendingModerators.length > 0 && (userRole === UserRole.ADMINISTRATOR || userRole === UserRole.MODERATOR) && (
                      <div className="ml-2">
                        <div className="text-xs text-gray-500">Pending:</div>
                        <div className="flex gap-2">
                          {ch.pendingModerators.map((appId: string) => (
                            <div key={appId} className="flex items-center gap-2">
                              <span className="text-xs">{appId.slice(0,6)}</span>
                              <ApproveModeratorButton channelId={ch._id} applicantId={appId} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* admin inline edit removed - admin UI available via Settings -> Admin Settings */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <hr className="my-3" />

      {/* Category groups in the requested order */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped[cat] || [];
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-sm font-medium mb-2">{CATEGORY_LABELS[cat] ?? cat}</div>
              <div className="space-y-2">
                {list.map((ch) => {
                  const canView = canViewLookup[ch._id] || false;
                    return (
                  <div key={ch._id} className="border rounded p-3 flex items-start justify-between bg-white/60 dark:bg-black/30">
                    {canView ? (
                      <Link href={`/?channel=${encodeURIComponent(ch._id)}`} className="flex-1 min-w-0">
                        <div>
                          <div className="font-medium truncate">{ch.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {ch.description}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div>
                          <div className="font-medium truncate">{ch.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{ch.description}</div>
                        </div>
                      </div>
                    )}
                    <div className="ml-4 flex items-center gap-2">
                      <ChannelJoinButton channelId={ch._id} initiallyJoined={ch.joined} isPrivate={ch.isPrivate} />
                      {userRole === UserRole.MODERATOR && !ch.isModerator && !ch.pendingModerator && (
                        <ModeratorApplyButton channelId={ch._id} />
                      )}
                      {ch.pendingModerators && ch.pendingModerators.length > 0 && (userRole === UserRole.ADMINISTRATOR || userRole === UserRole.MODERATOR) && (
                        <div className="ml-2">
                          <div className="text-xs text-gray-500">Pending:</div>
                          <div className="flex gap-2">
                            {ch.pendingModerators.map((appId: string) => (
                              <div key={appId} className="flex items-center gap-2">
                                <span className="text-xs">{appId.slice(0,6)}</span>
                                <ApproveModeratorButton channelId={ch._id} applicantId={appId} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* admin inline edit removed - admin UI available via Settings -> Admin Settings */}
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          );
        })}

        {/* any other categories */}
        {grouped['other'] && grouped['other'].length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Other</div>
            <div className="space-y-2">
              {grouped['other'].map((ch) => {
                const canView = canViewLookup[ch._id] || false;
                return (
                <div key={ch._id} className="border rounded p-3 flex items-start justify-between bg-white/60 dark:bg-black/30">
                  {canView ? (
                    <Link href={`/?channel=${encodeURIComponent(ch._id)}`} className="flex-1 min-w-0">
                      <div>
                        <div className="font-medium">{ch.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{ch.description}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div>
                        <div className="font-medium">{ch.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{ch.description}</div>
                      </div>
                    </div>
                  )}
                  <div className="ml-4 flex items-center gap-2">
                    <ChannelJoinButton channelId={ch._id} initiallyJoined={ch.joined} isPrivate={ch.isPrivate} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
