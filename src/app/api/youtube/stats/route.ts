import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "No video IDs provided" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    // Graceful fallback if no API key is provided
    return NextResponse.json({ stats: {} });
  }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${ids}&key=${apiKey}`
      );
  
      if (!response.ok) {
        throw new Error("Failed to fetch from YouTube API");
      }
  
      const data = await response.json();
      
      const stats: Record<string, { viewCount: string; publishedAt: string; title?: string; artist?: string; duration?: string }> = {};
      
      if (data.items) {
        data.items.forEach((item: any) => {
          stats[item.id] = {
            viewCount: item.statistics?.viewCount || "0",
            publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
            title: item.snippet?.title,
            artist: item.snippet?.channelTitle,
            duration: item.contentDetails?.duration,
          };
        });
      }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("YouTube API Error:", error);
    // Return empty stats gracefully rather than breaking the page
    return NextResponse.json({ stats: {} });
  }
}
