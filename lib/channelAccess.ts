import { resolveRoleFromSession } from './getRole';
import * as groupsLib from './groups';

export async function canViewChannel(ch: any, session: any): Promise<boolean> {
  if (!ch) return false;

  const isPrivate = (ch.type === 'private') || !!ch.hashedPasskey;
  // public channels are viewable by anyone
  if (!isPrivate) return true;

  const userId = session?.user?.id || null;
  if (!userId) return false;

  // explicit members can view
  if ((ch.members || []).includes(userId)) return true;

  // administrators/moderators (global) can view
  try {
    const role = await resolveRoleFromSession(session);
    if (role === 'administrator' || role === 'moderator') return true;
  } catch (e) {
    // ignore
  }

  // group-based visibility: if user belongs to any group that grants view to this channel
  try {
    const userGroups = await groupsLib.getUserGroups(userId);
    if (Array.isArray(userGroups) && userGroups.length > 0) {
      for (const g of userGroups) {
        const canView = (g.canViewChannels || []).map((x: any) => x?.toString?.() ?? x);
        const chId = ch._id?.toString?.() ?? ch._id;
        if (canView.includes(chId) || canView.includes(ch.slug)) return true;
      }
    }
  } catch (e) {
    // ignore
  }

  return false;
}

export async function isChannelModerator(ch: any, userId: string | null): Promise<boolean> {
  if (!ch || !userId) return false;
  // explicit moderator list
  if ((ch.moderators || []).includes(userId)) return true;
  // groups that grant moderation for this channel
  try {
    const userGroups = await groupsLib.getUserGroups(userId);
    if (Array.isArray(userGroups) && userGroups.length > 0) {
      const chId = ch._id?.toString?.() ?? ch._id;
      for (const g of userGroups) {
        const moderates = (g.moderatesChannels || []).map((x: any) => x?.toString?.() ?? x);
        if (moderates.includes(chId) || moderates.includes(ch.slug)) return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export default canViewChannel;
