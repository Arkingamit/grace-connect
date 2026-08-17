/**
 * Whether a member falls under a group leader's scope.
 * - FASL (campus-level): same campus + shares an assigned group
 * - Core Team Leader (global): shares an assigned group (any campus)
 * Non-group-leader roles: always true (caller applies their own rules)
 */
export function memberUnderLeaderScope(
  member: { campusId?: string; groups?: string[] | null },
  leader: { role: string; campusId?: string; groups?: string[] | null }
): boolean {
  if (leader.role !== 'group_leader') return true;

  const leaderGroups = leader.groups || [];
  if (leaderGroups.length === 0) return false;

  const memberGroups = member.groups || [];
  if (!memberGroups.some((g) => leaderGroups.includes(g))) return false;

  // FASL: campus-scoped only
  if (leader.campusId && leader.campusId !== 'global') {
    return member.campusId === leader.campusId;
  }

  // Core Team Leader: groups only, any campus
  return true;
}
