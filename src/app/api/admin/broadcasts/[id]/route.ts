import { verifySession } from '@/lib/auth-utils';
import connectToDatabase from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import User from '@/models/User';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const { id } = await params;
    await connectToDatabase();
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return apiError('Unauthorized', 401);
    }
    const user = await User.findById(session.userId);
    if (!user || !['group_leader', 'campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return apiError('Forbidden', 403);
    }

    const broadcast = await Broadcast.findById(id);
    if (!broadcast) {
      return apiError('Not found', 404);
    }

    // Only creator or higher roles can delete
    if (broadcast.createdBy !== session.userId && !['admin', 'super_admin'].includes(user.role)) {
      return apiError('Forbidden', 403);
    }

    await Broadcast.findByIdAndDelete(id);
    return apiSuccess({ success: true });
  });
}
