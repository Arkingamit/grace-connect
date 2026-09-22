import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';

export function wantsMemberNotification(input: unknown): boolean {
  return Boolean(
    input &&
    typeof input === 'object' &&
    (input as { sendNotification?: unknown }).sendNotification === true
  );
}

export function takeSendNotificationFlag(body: Record<string, unknown>): boolean {
  const send = wantsMemberNotification(body);
  delete body.sendNotification;
  return send;
}

type NotifyMembersInput = {
  title: string;
  message: string;
  type: string;
  sourceId?: string;
  targetCampuses?: string[];
  targetGroups?: string[];
};

export async function notifyMembers({
  title,
  message,
  type,
  sourceId,
  targetCampuses,
  targetGroups,
}: NotifyMembersInput) {
  const campuses = targetCampuses?.length ? targetCampuses : ['all'];
  const groups = targetGroups || [];

  await Notification.create({
    title,
    message,
    type,
    sourceId,
    targetCampuses: campuses,
    targetGroups: groups,
  });

  await sendPushToTargeted(
    { title, body: message, type },
    campuses,
    groups
  );
}

type LiveNotifySource = {
  _id?: { toString(): string };
  title?: string;
  campusId?: string;
  videoId?: string;
  notifyWhenLive?: boolean;
  lastLiveNotifiedVideoId?: string;
};

export async function notifyLiveIfNeeded(
  stream: LiveNotifySource,
  wasLive: boolean,
  isNowLive: boolean
): Promise<string | null> {
  if (!isNowLive || wasLive || !stream.notifyWhenLive) return null;

  const videoId = stream.videoId || '';
  if (videoId && videoId === stream.lastLiveNotifiedVideoId) return null;

  await notifyMembers({
    title: `We're live: ${stream.title || 'Join us now'}`,
    message: 'The live broadcast has started. Tap to watch.',
    type: 'live_now',
    sourceId: stream._id?.toString(),
    targetCampuses: stream.campusId ? [stream.campusId] : ['all'],
    targetGroups: [],
  });

  return videoId || 'live';
}
