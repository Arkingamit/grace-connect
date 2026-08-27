import mongoose from 'mongoose';
import User from '@/models/User';
import AttendanceRecord from '@/models/AttendanceRecord';
import EventRegistration from '@/models/EventRegistration';
import PrayerRequest from '@/models/PrayerRequest';
import PushSubscription from '@/models/PushSubscription';
import Notification from '@/models/Notification';
import { ListeningQuizAttempt } from '@/models/ListeningQuiz';

export async function deleteUserAccount(userId: string): Promise<{ error?: string; status?: number }> {
  const user = await User.findById(userId);
  if (!user) {
    return { error: 'Account not found', status: 404 };
  }

  if (user.role === 'super_admin') {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: 'super_admin',
    });
    if (otherAdmins === 0) {
      return { error: 'The last super admin account cannot be deleted.', status: 400 };
    }
  }

  const id = String(user._id);
  const objectId = user._id as mongoose.Types.ObjectId;
  const userIdMatch = { $in: [id, objectId] };

  const linked = await User.find({ parentAccountId: objectId }, { _id: 1 }).lean();
  const linkedIds = linked.map((p) => String(p._id));
  const allIds = [id, ...linkedIds];
  const allIdMatch = {
    $in: [...allIds, objectId, ...linked.map((p) => p._id)],
  };

  await Promise.all([
    AttendanceRecord.deleteMany({ userId: { $in: allIds } }),
    EventRegistration.deleteMany({ userId: allIdMatch }),
    PrayerRequest.deleteMany({ authorId: userIdMatch }),
    PushSubscription.deleteMany({ userId: { $in: allIds } }),
    Notification.deleteMany({ userId: { $in: allIds } }),
    ListeningQuizAttempt.deleteMany({ userId: { $in: allIds } }),
    User.deleteMany({ parentAccountId: objectId }),
  ]);

  await User.deleteOne({ _id: objectId });
  return {};
}
