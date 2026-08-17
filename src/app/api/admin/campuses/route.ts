import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Campus from '@/models/Campus';
import { serverCache, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Check in-memory cache first
    const cached = serverCache.get('campuses');
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();
    const campuses = await Campus.find({}).sort({ createdAt: 1 }).lean();

    // Cache for 10 minutes
    serverCache.set('campuses', campuses, CACHE_TTL.CAMPUSES);

    return NextResponse.json(campuses);
  } catch (error: any) {
    console.error('Error fetching campuses:', error);
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const campus = await Campus.create(body);

    // Invalidate campuses cache
    serverCache.invalidate('campuses');

    return NextResponse.json(campus, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campus:', error);
    return NextResponse.json({ error: 'Failed to create campus' }, { status: 500 });
  }
}
