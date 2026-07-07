import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { DailyVerse } from '@/models/DailyVerse';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const verses = await DailyVerse.find({}).sort({ dayOfYear: 1 });
    return NextResponse.json(verses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch verses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { verses } = await req.json();
    if (!Array.isArray(verses)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Clear existing verses
    await DailyVerse.deleteMany({});
    
    // Insert new verses, assigning dayOfYear automatically (1 to verses.length)
    const newVerses = verses.map((verse, index) => ({
      dayOfYear: index + 1,
      text: verse.text,
      reference: verse.reference,
    }));

    await DailyVerse.insertMany(newVerses);
    
    return NextResponse.json({ success: true, count: newVerses.length });
  } catch (error) {
    console.error('Error saving verses:', error);
    return NextResponse.json({ error: 'Failed to save verses' }, { status: 500 });
  }
}

export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    await DailyVerse.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete verses' }, { status: 500 });
  }
}
