import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let albumUrl = searchParams.get('url');

  if (!albumUrl) {
    return NextResponse.json({ error: 'Album URL is required' }, { status: 400 });
  }

  // Reject empty or clearly invalid URLs before making any network request
  if (albumUrl.trim() === '') {
    return NextResponse.json({ error: 'Album URL is empty', photos: [] }, { status: 400 });
  }

  // Guard against double-URL concatenation bug (two full URLs merged together)
  const googlePhotosHosts = ['photos.app.goo.gl', 'photos.google.com'];
  const isValidGooglePhotosUrl = googlePhotosHosts.some(host => albumUrl.includes(host));
  if (!isValidGooglePhotosUrl) {
    console.warn(`Rejected non-Google-Photos URL: ${albumUrl.substring(0, 80)}`);
    return NextResponse.json({ error: 'URL must be a Google Photos album link', photos: [] }, { status: 400 });
  }

  // Detect double-URL concatenation (e.g. "...keyValuehttps://photos...")
  const secondHttpsIndex = albumUrl.indexOf('https://', 10);
  if (secondHttpsIndex !== -1) {
    console.warn(`Double URL detected, trimming to first URL`);
    albumUrl = albumUrl.substring(0, secondHttpsIndex);
  }

  try {
    console.log(`Fetching gallery photos from: ${albumUrl}`);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(albumUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Google Photos response not OK: ${response.status} ${response.statusText}`);
        return NextResponse.json({ 
          error: `Failed to fetch album from Google Photos: ${response.statusText}`,
          status: response.status 
        }, { status: 502 }); // Bad Gateway
      }

      const html = await response.text();
      console.log(`Received HTML length: ${html.length}`);
      
      const imgRegex = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[^"]+)"/g;
      const matches = Array.from(html.matchAll(imgRegex));
      console.log(`Found ${matches.length} initial matches`);
      
      const uniqueUrls = Array.from(new Set(matches.map(m => m[1])));
      const photoUrls = uniqueUrls.filter(url => url.length > 50 && !url.includes('proxy'));
      console.log(`Found ${photoUrls.length} unique photo URLs`);

      if (photoUrls.length === 0) {
        return NextResponse.json({ error: 'No photos found in the provided album URL. Make sure the album is public.', photos: [] });
      }

      // Do not shuffle to ensure the first photo is deterministic (static thumbnail)
      const limited = photoUrls.slice(0, 20);

      const photos = limited.map((url, index) => ({
        id: index + 100,
        src: url,
        title: `Gallery Image ${index + 1}`,
        category: "All",
      }));

      return NextResponse.json({ photos });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Request to Google Photos timed out' }, { status: 504 });
      }
      throw fetchError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Gallery API Internal Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
