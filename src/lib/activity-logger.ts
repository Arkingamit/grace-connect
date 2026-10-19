import connectToDatabase from '@/lib/db';
import ActivityLog, { type ActivityAction, type ActivityEntityType } from '@/models/ActivityLog';

export interface LogActivityParams {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityTitle: string;
  campusId?: string;
  campusName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface AdminActor {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  campusId?: string;
}

/**
 * Strips sensitive data like passwords or tokens before logging
 */
function sanitizeDetails(details?: Record<string, any>): Record<string, any> {
  if (!details || typeof details !== 'object') return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(details)) {
    if (/password|token|secret|auth/i.test(key)) {
      continue;
    }
    // Limit very large string lengths
    if (typeof val === 'string' && val.length > 500) {
      clean[key] = val.substring(0, 500) + '...';
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Record an activity log entry safely without blocking or throwing.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await connectToDatabase();
    await ActivityLog.create({
      userId: params.userId || 'system',
      userName: params.userName || 'System',
      userEmail: params.userEmail || '',
      userRole: params.userRole || 'admin',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || '',
      entityTitle: params.entityTitle || 'Untitled',
      campusId: params.campusId || '',
      campusName: params.campusName || '',
      details: sanitizeDetails(params.details),
      ipAddress: params.ipAddress || '',
    });
  } catch (error) {
    console.error('[activity-logger] Failed to log activity:', error);
  }
}

/**
 * Helper to log activity directly from an authenticated admin session object
 */
export async function logActivityFromAdmin(
  admin: AdminActor | null | undefined,
  params: Omit<LogActivityParams, 'userId' | 'userName' | 'userEmail' | 'userRole'>
): Promise<void> {
  if (!admin) return;
  return logActivity({
    ...params,
    userId: admin.userId,
    userName: admin.name || 'Admin',
    userEmail: admin.email || '',
    userRole: admin.role || 'admin',
    campusId: params.campusId || admin.campusId || '',
  });
}
