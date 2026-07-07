import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { SystemSettings } from '@/models/SystemSettings';
import { requireAdmin } from '@/lib/api-auth';
import { serverCache, CACHE_TTL } from '@/lib/cache';

// GET is public so the app can check version on launch
export async function GET() {
  try {
    // Check in-memory cache first
    const cached = serverCache.get('system-settings');
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();
    let settings = await SystemSettings.findOne().lean();
    if (!settings) {
      const created = await SystemSettings.create({ minAppVersion: '0.1.0' });
      settings = created.toObject();
    }

    // Cache for 10 minutes
    serverCache.set('system-settings', settings, CACHE_TTL.SYSTEM_SETTINGS);

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

// PUT is restricted to Admins (Super Admins should be enforced in UI or here)
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin required.' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create(body);
    } else {
      settings = await SystemSettings.findOneAndUpdate({}, body, { new: true });
    }

    // Invalidate system settings cache
    serverCache.invalidate('system-settings');
    
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update system settings' }, { status: 500 });
  }
}
