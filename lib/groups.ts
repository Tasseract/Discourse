import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type GroupDoc = {
  _id?: any;
  name: string;
  slug?: string;
  description?: string;
  members?: string[]; // user ids
  canPostIn?: string[]; // channel ids or slugs
  moderatesChannels?: string[]; // channel ids
  canViewChannels?: string[]; // channel ids
  createdAt?: Date;
};

export async function listGroups(): Promise<GroupDoc[]> {
  const db = await getDatabase();
  const coll = db.collection('groups');
  const all = await coll.find({}).toArray();
  return all.map((g: any) => ({ ...g, _id: g._id.toString() }));
}

export async function getGroup(id: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const g = await coll.findOne({ _id: new ObjectId(id) });
    if (!g) return null;
    return { ...g, _id: g._id.toString() };
  } catch (e) {
    return null;
  }
}

export async function createGroup(payload: Partial<GroupDoc>) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  const doc: any = {
    name: (payload.name || '').trim(),
    slug: payload.slug || ((payload.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    description: payload.description || '',
    members: payload.members || [],
    canPostIn: payload.canPostIn || [],
    moderatesChannels: payload.moderatesChannels || [],
    canViewChannels: payload.canViewChannels || [],
    createdAt: new Date(),
  };
  const res = await coll.insertOne(doc);
  return res.insertedId.toString();
}

export async function updateGroup(id: string, update: Partial<GroupDoc>) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const { ObjectId } = await import('mongodb');
    await coll.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteGroup(id: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const { ObjectId } = await import('mongodb');
    await coll.deleteOne({ _id: new ObjectId(id) });
    return true;
  } catch (e) {
    return false;
  }
}

export async function addUserToGroup(groupId: string, userId: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const { ObjectId } = await import('mongodb');
    await coll.updateOne({ _id: new ObjectId(groupId) }, { $addToSet: { members: userId } } as any);
    return true;
  } catch (e) {
    return false;
  }
}

export async function removeUserFromGroup(groupId: string, userId: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const { ObjectId } = await import('mongodb');
    await coll.updateOne({ _id: new ObjectId(groupId) }, { $pull: { members: userId } } as any);
    return true;
  } catch (e) {
    return false;
  }
}

export async function isUserInGroup(userId: string, groupId: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  try {
    const { ObjectId } = await import('mongodb');
    const g = await coll.findOne({ _id: new ObjectId(groupId), members: userId });
    return !!g;
  } catch (e) {
    return false;
  }
}

export async function getUserGroups(userId: string) {
  const db = await getDatabase();
  const coll = db.collection('groups');
  const list = await coll.find({ members: userId }).toArray();
  return list.map((g: any) => ({ ...g, _id: g._id.toString() }));
}

export default {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  isUserInGroup,
  getUserGroups,
};
