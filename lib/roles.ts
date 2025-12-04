export enum UserRole {
  GUEST = 'guest',
  MEMBER = 'member',
  MODERATOR = 'moderator',
  ADMINISTRATOR = 'administrator'
}

// Define all possible permissions
export const Permissions = {
  canCreatePosts: 'canCreatePosts',
  canVote: 'canVote',
  canModerate: 'canModerate',
  canManageRoles: 'canManageRoles'
} as const;

// Define permissions for each role
const rolePermissions: Record<UserRole, readonly (keyof typeof Permissions)[]> = {
  [UserRole.GUEST]: [],
  [UserRole.MEMBER]: ['canCreatePosts', 'canVote'],
  [UserRole.MODERATOR]: ['canCreatePosts', 'canVote', 'canModerate'],
  [UserRole.ADMINISTRATOR]: ['canCreatePosts', 'canVote', 'canModerate', 'canManageRoles']
};

export type Permission = keyof typeof Permissions;

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (rolePermissions[role] || []).includes(permission) || false;
}

// Helper function to get all permissions for a role
export function getRolePermissions(role: UserRole): readonly string[] {
  return (rolePermissions[role] || []) as readonly string[];
}

export default UserRole;
