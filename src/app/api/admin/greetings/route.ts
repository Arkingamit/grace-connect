import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { requireAdminWithScope } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdminWithScope();
    
    // Only allow campus leaders and above
    if (!adminUser || !['campus_leader', 'admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const suffix = `-${month}-${day}`;

    // Filter by campus if campus_leader
    const query: any = { status: 'approved' };

    if (filter === 'all') {
      // Find anyone who has a birthday or anniversary
      query.$or = [
        { birthday: { $exists: true, $ne: '' } },
        { marriageDate: { $exists: true, $ne: '' } },
      ];
    } else {
      // Today only
      query.$or = [
        { birthday: { $regex: `${suffix}$` } },
        { marriageDate: { $regex: `${suffix}$` } },
      ];
    }

    if (adminUser.role === 'campus_leader') {
      query.campusId = adminUser.campusId;
    }

    const users = await User.find(query)
      .select('_id firstName lastName name email phone whatsapp birthday marriageDate campusId')
      .lean();

    // Map the results to determine the event type
    const greetings = users.map((user: any) => {
      let isBirthday = false;
      let isAnniversary = false;
      
      if (filter === 'all') {
        isBirthday = !!user.birthday;
        isAnniversary = !!user.marriageDate;
      } else {
        isBirthday = user.birthday?.endsWith(suffix);
        isAnniversary = user.marriageDate?.endsWith(suffix);
      }
      
      const events = [];
      if (isBirthday) events.push('birthday');
      if (isAnniversary) events.push('anniversary');

      return {
        ...user,
        _id: user._id.toString(),
        events,
      };
    });

    return NextResponse.json({ greetings });
  } catch (error: any) {
    console.error('Error fetching greetings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
