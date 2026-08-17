import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Campus from '@/models/Campus';
import { serverCache } from '@/lib/cache';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const campus = await Campus.findByIdAndUpdate(id, body, { new: true });
    
    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }
    
    // Invalidate campuses cache
    serverCache.invalidate('campuses');

    return NextResponse.json(campus);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const campus = await Campus.findByIdAndDelete(id);
    
    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }
    
    // Invalidate campuses cache
    serverCache.invalidate('campuses');

    return NextResponse.json({ message: 'Campus deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete campus' }, { status: 500 });
  }
}
