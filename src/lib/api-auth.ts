import { verifySession } from './auth-utils';
import connectToDatabase from './db';
import User from '@/models/User';

/**
 * Ensures the requester is authenticated (at least a member).
 * Returns the session if authorized, or null if not.
 */
export async function requireAuth() {
  const session = await verifySession();

  if (!session.isAuth || !session.userId) {
    return null;
  }

  return session;
}

/**
 * Ensures the requester is authenticated and has an admin-level role.
 * Reads role directly from the JWT — no database query required.
 * Returns a lightweight session object if authorized, or null if not.
 */
export async function requireAdmin() {
  const session = await verifySession();

  if (!session.isAuth || !session.userId) {
    return null;
  }

  // Role is embedded in the JWT — no DB round-trip needed
  const allowedRoles = ['admin', 'super_admin', 'campus_leader', 'group_leader'];
  if (!allowedRoles.includes(session.role)) {
    return null;
  }

  return { userId: session.userId, role: session.role };
}

/**
 * Like requireAdmin(), but fetches the full user profile from DB
 * so we can enforce campus/group scope restrictions.
 * Use this when you need to validate targetCampuses/targetGroups.
 */
export async function requireAdminWithScope() {
  const session = await verifySession();

  if (!session.isAuth || !session.userId) {
    return null;
  }

  const allowedRoles = ['admin', 'super_admin', 'campus_leader', 'group_leader'];
  if (!allowedRoles.includes(session.role)) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findById(session.userId).select('role campusId groups name').lean();
  if (!user) return null;

  return {
    userId: session.userId,
    role: user.role as string,
    campusId: user.campusId as string,
    groups: (user.groups || []) as string[],
    name: user.name as string,
  };
}

/**
 * Enforce campus scope on targetCampuses.
 * - admin/super_admin: any targets allowed
 * - Core Team Leader (group_leader + global): any campuses / default 'all'
 * - campus_leader / FASL Leader: only their own campusId
 * Returns the sanitized targetCampuses array.
 */
export function enforceCampusScope(
  role: string,
  campusId: string,
  requestedCampuses: string[] | undefined
): string[] {
  if (role === 'admin' || role === 'super_admin') {
    return requestedCampuses || ['all'];
  }
  // Core Team Leader: cross-campus for their groups
  if (role === 'group_leader' && campusId === 'global') {
    if (!requestedCampuses || requestedCampuses.length === 0) return ['all'];
    return requestedCampuses;
  }
  // campus_leader and FASL Leader can only target their own campus
  return [campusId];
}

/**
 * Enforce group scope on targetGroups.
 * - admin/super_admin/campus_leader: any groups allowed
 * - group_leader: only their own assigned groups
 * Returns the sanitized targetGroups array.
 */
export function enforceGroupScope(
  role: string,
  userGroups: string[],
  requestedGroups: string[] | undefined
): string[] {
  if (role === 'admin' || role === 'super_admin' || role === 'campus_leader') {
    return requestedGroups || [];
  }
  // group_leader can only target their own groups
  if (!requestedGroups || requestedGroups.length === 0) {
    return userGroups; // default to all their groups
  }
  return requestedGroups.filter(g => userGroups.includes(g));
}
