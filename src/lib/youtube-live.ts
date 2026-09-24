export type YoutubeLiveResult = { isLive: boolean; videoId?: string };

function livePageUrl(channelId: string): string {
  let cleanId = channelId.trim();
  let url = '';

  if (cleanId.includes('youtube.com/')) {
    try {
      const urlObj = new URL(cleanId);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'channel' && pathParts[1]) {
        cleanId = pathParts[1];
      } else if (pathParts[0] === 'c' && pathParts[1]) {
        return `https://www.youtube.com/c/${pathParts[1]}/live`;
      } else if (pathParts[0]?.startsWith('@')) {
        cleanId = pathParts[0];
      } else {
        cleanId = pathParts[0];
      }
    } catch {
      // keep cleanId
    }
  }

  if (cleanId.startsWith('@')) {
    url = `https://www.youtube.com/${cleanId}/live`;
  } else if (cleanId.startsWith('UC') && cleanId.length > 15) {
    url = `https://www.youtube.com/channel/${cleanId}/live`;
  } else {
    url = `https://www.youtube.com/@${cleanId}/live`;
  }

  return url;
}

function parseLiveHtml(html: string): YoutubeLiveResult {
  const isLiveNow = /"isLiveNow"\s*:\s*true/.test(html);
  const canonical = html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)"/)?.[1];
  const embedded = html.match(/"videoDetails":\{[^}]*"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
  const videoId = canonical || embedded;

  if (isLiveNow && videoId) {
    return { isLive: true, videoId };
  }

  // /live sometimes only exposes the watch canonical while the stream is live
  if (canonical && (isLiveNow || /"isLiveBroadcast"\s*:\s*true/.test(html))) {
    return { isLive: true, videoId: canonical };
  }

  return { isLive: false };
}

export async function checkYouTubeLive(channelId: string): Promise<YoutubeLiveResult> {
  const url = livePageUrl(channelId);
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
    cache: 'no-store',
  });

  const html = await res.text();
  return parseLiveHtml(html);
}
