import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Campus from '@/models/Campus';

export const dynamic = 'force-dynamic';

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'campus-qr-code';
}

export async function GET(req: Request) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const campusId = url.searchParams.get('campusId') || '';
  const sizeRaw = Number(url.searchParams.get('size') || '512');
  const size = Number.isFinite(sizeRaw) ? Math.min(1024, Math.max(200, Math.round(sizeRaw))) : 512;

  if (!campusId || !mongoose.Types.ObjectId.isValid(campusId)) {
    return NextResponse.json({ error: 'Campus is required' }, { status: 400 });
  }

  if (admin.role === 'campus_leader' && admin.campusId && admin.campusId !== campusId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDatabase();
  const campus = await Campus.findById(campusId).select('name').lean();
  if (!campus) {
    return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
  }

  const loginUrl = `${url.origin}/login`;
  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=${size}x${size}&data=${encodeURIComponent(loginUrl)}&format=png&margin=10`;

  const qrRes = await fetch(qrUrl, { cache: 'no-store' });
  if (!qrRes.ok) {
    return NextResponse.json({ error: 'Could not create the QR image. Please try again.' }, { status: 502 });
  }

  const bytes = await qrRes.arrayBuffer();
  const filename = `${safeFilename((campus as { name?: string }).name || 'campus')}-qr-code.png`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
