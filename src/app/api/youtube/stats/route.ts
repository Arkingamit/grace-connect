import { NextResponse } from "next/server";

function formatDurationLabel(iso?: string) {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const totalMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${Math.max(1, totalMinutes)} min`;
}

function formatDateLabel(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function shortDescription(raw?: string) {
  if (!raw) return "";
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).trimEnd()}…`;
}

async function oEmbedFallback(ids: string[]) {
  const stats: Record<string, Record<string, string>> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        );
        if (!res.ok) return;
        const data = await res.json();
        stats[id] = {
          viewCount: "0",
          publishedAt: "",
          title: data.title || "",
          artist: data.author_name || "",
          duration: "",
          durationLabel: "",
          dateLabel: "",
          description: "",
        };
      } catch {
        // ignore individual failures
      }
    }),
  );
  return stats;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "No video IDs provided" }, { status: 400 });
  }

  const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ stats: await oEmbedFallback(idList) });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${idList.join(",")}&key=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from YouTube API");
    }

    const data = await response.json();
    const stats: Record<string, Record<string, string>> = {};

    if (data.items) {
      data.items.forEach((item: any) => {
        stats[item.id] = {
          viewCount: item.statistics?.viewCount || "0",
          publishedAt: item.snippet?.publishedAt || "",
          title: item.snippet?.title || "",
          artist: item.snippet?.channelTitle || "",
          duration: item.contentDetails?.duration || "",
          durationLabel: formatDurationLabel(item.contentDetails?.duration),
          dateLabel: formatDateLabel(item.snippet?.publishedAt),
          description: shortDescription(item.snippet?.description),
        };
      });
    }

    const missing = idList.filter((id) => !stats[id]?.title);
    if (missing.length) {
      const fallback = await oEmbedFallback(missing);
      Object.assign(stats, fallback);
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("YouTube API Error:", error);
    return NextResponse.json({ stats: await oEmbedFallback(idList) });
  }
}
