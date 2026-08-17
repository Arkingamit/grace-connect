import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { DailyVerse } from '@/models/DailyVerse';
import { serverCache, CACHE_TTL } from '@/lib/cache';

// Helper to get current day of year (1-366)
function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function GET() {
  try {
    // Check in-memory cache first (1 hour TTL)
    const cached = serverCache.get('daily-verse');
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();
    
    // Get total count of verses
    const totalVerses = await DailyVerse.countDocuments();
    
    if (totalVerses === 0) {
      // Fallback if no verses uploaded
      const fallback = {
        text: "The Lord is my shepherd; I shall not want.",
        reference: "Psalm 23:1"
      };
      serverCache.set('daily-verse', fallback, CACHE_TTL.DAILY_VERSE);
      return NextResponse.json(fallback);
    }

    const currentDayOfYear = getDayOfYear(new Date());
    
    // If they uploaded 365 verses, it loops perfectly. 
    // If they uploaded 10 verses, it loops every 10 days.
    let targetDay = currentDayOfYear % totalVerses;
    if (targetDay === 0) targetDay = totalVerses; // 1-indexed

    const verse = await DailyVerse.findOne({ dayOfYear: targetDay }).lean();

    if (!verse) {
      // Fallback to the first verse just in case
      const firstVerse = await DailyVerse.findOne({ dayOfYear: 1 }).lean();
      if (firstVerse) {
        serverCache.set('daily-verse', firstVerse, CACHE_TTL.DAILY_VERSE);
        return NextResponse.json(firstVerse);
      }
      
      const fallback = {
        text: "The Lord is my shepherd; I shall not want.",
        reference: "Psalm 23:1"
      };
      serverCache.set('daily-verse', fallback, CACHE_TTL.DAILY_VERSE);
      return NextResponse.json(fallback);
    }

    // Cache for 1 hour
    serverCache.set('daily-verse', verse, CACHE_TTL.DAILY_VERSE);
    return NextResponse.json(verse);
  } catch (error) {
    console.error('Error fetching daily verse:', error);
    return NextResponse.json({ 
      text: "The Lord is my shepherd; I shall not want.",
      reference: "Psalm 23:1"
    });
  }
}
