import { NextResponse } from "next/server";
import {
  formatYoutubeDateLabel,
  formatYoutubeDurationLabel,
  shortYoutubeDescription,
} from "@/lib/youtube";

type YoutubeStats = {
  viewCount: string;
  publishedAt: string;
  title: string;
  artist: string;
  duration: string;
  durationLabel: string;
  dateLabel: string;
  description: string;
};

function emptyStats(): YoutubeStats {
  return {
    viewCount: "0",
    publishedAt: "",
    title: "",
    artist: "",
    duration: "",
    durationLabel: "",
    dateLabel: "",
    description: "",
  };
}

function mergeStats(base: YoutubeStats, extra: Partial<YoutubeStats>): YoutubeStats {
  return {
    viewCount: extra.viewCount && extra.viewCount !== "0" ? extra.viewCount : base.viewCount,
    publishedAt: extra.publishedAt || base.publishedAt,
    title: extra.title || base.title,
    artist: extra.artist || base.artist,
    duration: extra.duration || base.duration,
    durationLabel: extra.durationLabel || base.durationLabel,
    dateLabel: extra.dateLabel || base.dateLabel,
    description: extra.description || base.description,
  };
}

function extractJsonAfter(html: string, marker: string) {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const brace = html.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = brace; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(brace, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function oEmbedFallback(id: string): Promise<Partial<YoutubeStats>> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    );
    if (!res.ok) return {};
    const data = await res.json();
    return {
      title: data.title || "",
      artist: data.author_name || "",
    };
  } catch {
    return {};
  }
}

async function scrapeWatchPage(id: string): Promise<Partial<YoutubeStats>> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return {};
    const html = await res.text();
    const player = extractJsonAfter(html, "ytInitialPlayerResponse");
    const details = player?.videoDetails;
    const micro = player?.microformat?.playerMicroformatRenderer;
    const length = details?.lengthSeconds ? Number(details.lengthSeconds) : 0;
    const publishedAt = micro?.publishDate || micro?.uploadDate || "";
    return {
      title: details?.title || micro?.title?.simpleText || "",
      artist: details?.author || micro?.ownerChannelName || "",
      publishedAt,
      dateLabel: formatYoutubeDateLabel(publishedAt),
      durationLabel: formatYoutubeDurationLabel(undefined, length),
      duration: length ? `PT${Math.floor(length / 60)}M${length % 60}S` : "",
      description: shortYoutubeDescription(
        details?.shortDescription || micro?.description?.simpleText || "",
      ),
      viewCount: details?.viewCount || micro?.viewCount || "0",
    };
  } catch {
    return {};
  }
}

async function enrichWithoutApiKey(ids: string[]) {
  const stats: Record<string, YoutubeStats> = {};
  await Promise.all(
    ids.map(async (id) => {
      const [embed, scraped] = await Promise.all([oEmbedFallback(id), scrapeWatchPage(id)]);
      stats[id] = mergeStats(emptyStats(), { ...embed, ...scraped });
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
    return NextResponse.json({ stats: await enrichWithoutApiKey(idList) });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${idList.join(",")}&key=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from YouTube API");
    }

    const data = await response.json();
    const stats: Record<string, YoutubeStats> = {};

    if (data.items) {
      data.items.forEach((item: any) => {
        stats[item.id] = {
          viewCount: item.statistics?.viewCount || "0",
          publishedAt: item.snippet?.publishedAt || "",
          title: item.snippet?.title || "",
          artist: item.snippet?.channelTitle || "",
          duration: item.contentDetails?.duration || "",
          durationLabel: formatYoutubeDurationLabel(item.contentDetails?.duration),
          dateLabel: formatYoutubeDateLabel(item.snippet?.publishedAt),
          description: shortYoutubeDescription(item.snippet?.description),
        };
      });
    }

    const missing = idList.filter((id) => !stats[id]?.title || !stats[id]?.durationLabel);
    if (missing.length) {
      const fallback = await enrichWithoutApiKey(missing);
      missing.forEach((id) => {
        stats[id] = mergeStats(stats[id] || emptyStats(), fallback[id] || {});
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("YouTube API Error:", error);
    return NextResponse.json({ stats: await enrichWithoutApiKey(idList) });
  }
}
