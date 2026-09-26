import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Campus from '@/models/Campus';

export async function GET() {
  try {
    await connectToDatabase();
    // Return only public information
    const campuses = await Campus.find(
      {},
      'name pastor address city zipCode phone email serviceTimes latitude longitude',
    )
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json(campuses);
  } catch (error: any) {
    console.error('Error fetching public campuses:', error);
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 });
  }
}
