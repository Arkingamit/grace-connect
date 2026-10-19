"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search as SearchIcon,
  Calendar,
  BookOpen,
  FileText,
  Music,
  Film,
  Image as ImageIcon,
  Layers,
  Bell,
  Play,
  ArrowRight,
  ChevronRight,
  Sparkles,
  X,
  MapPin,
  History,
  Trash2,
  Radio,
  Tv,
  Flame,
  Copy,
  Clock,
  Share2,
} from 'lucide-react';
import { useAdminData, GalleryAlbum } from '@/lib/admin-data-context';
import { sermonWatchHref } from '@/lib/sermon-utils';
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/youtube';
import { formatDDMMYYYY } from '@/lib/date-utils';
import { Card } from '@/components/ui/card';
import {
  scoreItem,
  type SearchItemType,
  type SearchResultItem,
  type MatchableFields,
} from '@/lib/fuzzy-search';
import { getAlbumTimestamp } from '@/lib/types';

const POPULAR_SUGGESTIONS = [
  'Sunday Sermon',
  'Worship (Aradhana)',
  'Prarthana (Prayer)',
  'Vachan (Message)',
  'Youth (Yuva)',
  'Geet (Songs)',
  'Tasveere (Photos)',
  'Suchna (Notices)',
  'Christmas',
  'Baptism',
];

type CategoryFilter = 'all' | 'live' | SearchItemType;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'sermon', label: 'Sermons' },
  { id: 'worship', label: 'Worship' },
  { id: 'photo', label: 'Photos' },
  { id: 'video', label: 'Videos' },
  { id: 'event', label: 'Events' },
  { id: 'note', label: 'Notes' },
  { id: 'series', label: 'Series' },
  { id: 'announcement', label: 'Notices' },
];

function getEditorialCardTheme(type: string) {
  switch (type) {
    case 'announcement':
      return {
        badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        gradient: 'bg-gradient-to-b from-[#FFFDF5] via-[#FFF9EC] to-white',
        border: 'border-[#FDE68A]/80 hover:border-[#D97706]/40',
        icon: Bell,
        watermark: 'text-[#D97706]/[0.08]',
        readText: 'Read',
      };
    case 'note':
      return {
        badgeBg: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/20',
        gradient: 'bg-gradient-to-b from-[#FFFDFD] via-[#FFF5F5] to-white',
        border: 'border-[#8B2323]/20 hover:border-[#8B2323]/40',
        icon: FileText,
        watermark: 'text-[#8B2323]/[0.07]',
        readText: 'View note',
      };
    case 'event':
      return {
        badgeBg: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/25',
        gradient: 'bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-white',
        border: 'border-[#8B2323]/20 hover:border-[#8B2323]/40',
        icon: Calendar,
        watermark: 'text-[#8B2323]/[0.07]',
        readText: 'Details',
      };
    default:
      return {
        badgeBg: 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]',
        gradient: 'bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-white',
        border: 'border-[#E5D5C5]/80 hover:border-[#8B2323]/30',
        icon: Sparkles,
        watermark: 'text-[#7A6150]/[0.07]',
        readText: 'Open',
      };
  }
}

function sanitizeCategory(cat?: string, fallback: string = ''): string {
  if (!cat) return fallback;
  const trimmed = cat.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'general' || lower === 'worship') return fallback;
  return trimmed;
}

function sanitizeSubtitle(sub?: string): string | undefined {
  if (!sub) return undefined;
  const cleaned = sub
    .replace(/^(general|worship)\s*[•·-]\s*/i, '')
    .replace(/\s*[•·-]\s*(general|worship)$/i, '')
    .replace(/^(general|worship)$/i, '')
    .trim();
  return cleaned || undefined;
}

function cleanThumbnailUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('img.youtube.com') && url.includes('/hqdefault.jpg')) {
    return url.replace('/hqdefault.jpg', '/mqdefault.jpg');
  }
  return url;
}

interface RecentSearchItem {
  id: string;
  kind: 'query' | 'item';
  queryText?: string;
  itemData?: {
    id: string;
    type: SearchItemType;
    title: string;
    subtitle?: string;
    category?: string;
    thumbnail?: string;
    href: string;
    videoId?: string;
  };
}

function parseStoredRecentSearches(stored: string | null): RecentSearchItem[] {
  if (!stored) return [];
  try {
    const raw = JSON.parse(stored);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry: any) => {
        if (typeof entry === 'string') {
          return {
            id: `query-${entry.toLowerCase()}`,
            kind: 'query' as const,
            queryText: entry,
          };
        }
        if (entry && typeof entry === 'object') {
          if (entry.kind === 'item' && entry.itemData) {
            return entry as RecentSearchItem;
          }
          if (entry.kind === 'query' && entry.queryText) {
            return entry as RecentSearchItem;
          }
          if (entry.title && entry.href) {
            return {
              id: `item-${entry.id || entry.title}`,
              kind: 'item' as const,
              itemData: entry,
            };
          }
          if (entry.text) {
            return {
              id: `query-${entry.text.toLowerCase()}`,
              kind: 'query' as const,
              queryText: entry.text,
            };
          }
        }
        return null;
      })
      .filter(Boolean) as RecentSearchItem[];
  } catch {
    return [];
  }
}

interface ExploreFeedItem {
  id: string;
  type: SearchItemType | 'live';
  title: string;
  subtitle?: string;
  description?: string;
  date?: string;
  timestamp: number;
  timeAgo: string;
  category: string;
  thumbnail?: string;
  href: string;
  isNew: boolean;
  videoId?: string;
  raw?: any;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Recent';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 0) return 'Upcoming';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SearchPage() {
  const router = useRouter();
  const {
    events,
    sermons,
    sermonSeries,
    announcements,
    worshipVideos,
    galleryAlbums,
    broadcasts: contextBroadcasts,
    campuses,
    liveStreams: contextLiveStreams,
    prayerRequests,
  } = useAdminData();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryFilter>('all');
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [localBroadcasts, setLocalBroadcasts] = useState<any[]>(contextBroadcasts || []);
  const [localGalleryAlbums, setLocalGalleryAlbums] = useState<any[]>(galleryAlbums || []);
  const [localPrayers, setLocalPrayers] = useState<any[]>(prayerRequests || []);
  const [liveStreams, setLiveStreams] = useState<any[]>(contextLiveStreams || []);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedAlbumsRef = useRef<Set<string>>(new Set());

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('grace_recent_searches');
      if (stored) {
        setRecentSearches(parseStoredRecentSearches(stored).slice(0, 10));
      }
    } catch {}
  }, []);

  // Fetch fresh livestreams on mount to ensure real-time live detection
  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/media/livestreams', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setLiveStreams(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync context live streams when updated
  useEffect(() => {
    if (contextLiveStreams && contextLiveStreams.length > 0) {
      setLiveStreams(contextLiveStreams);
    }
  }, [contextLiveStreams]);

  // Ensure broadcasts (notes) are loaded if context was initially empty
  useEffect(() => {
    if (contextBroadcasts && contextBroadcasts.length > 0) {
      setLocalBroadcasts(contextBroadcasts);
    } else {
      fetch('/api/broadcasts')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setLocalBroadcasts(data);
        })
        .catch(() => {});
    }
  }, [contextBroadcasts]);

  // Fetch gallery albums directly if context is empty
  useEffect(() => {
    if (galleryAlbums && galleryAlbums.length > 0) {
      setLocalGalleryAlbums(galleryAlbums);
    } else {
      fetch('/api/admin/media/gallery')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setLocalGalleryAlbums(data);
        })
        .catch(() => {});
    }
  }, [galleryAlbums]);

  // Fetch prayer requests directly if context is empty
  useEffect(() => {
    if (prayerRequests && prayerRequests.length > 0) {
      setLocalPrayers(prayerRequests);
    } else {
      fetch('/api/prayers')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setLocalPrayers(data);
        })
        .catch(() => {});
    }
  }, [prayerRequests]);

  const effectiveGallery = localGalleryAlbums.length > 0 ? localGalleryAlbums : (galleryAlbums || []);
  const effectivePrayers = localPrayers.length > 0 ? localPrayers : (prayerRequests || []);

  // Lazy-resolve covers for gallery albums
  useEffect(() => {
    const fetchCovers = async () => {
      let changed = false;
      const newCovers: Record<string, string> = {};

      for (const album of effectiveGallery) {
        if (album.coverImage && !fetchedAlbumsRef.current.has(album.id)) {
          fetchedAlbumsRef.current.add(album.id);
          newCovers[album.id] = album.coverImage;
          changed = true;
        } else if (!album.coverImage && !fetchedAlbumsRef.current.has(album.id)) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) {
            fetchedAlbumsRef.current.add(album.id);
            newCovers[album.id] = youtubeThumbnailUrl(ytId);
            changed = true;
          }
        }
      }

      for (const album of effectiveGallery) {
        if (!fetchedAlbumsRef.current.has(album.id) && album.url && !album.coverImage) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) continue;
          fetchedAlbumsRef.current.add(album.id);
          try {
            const res = await fetch(
              `/api/gallery/photos?url=${encodeURIComponent(album.url)}&albumId=${encodeURIComponent(album.id)}&persistCover=1`
            );
            if (!res.ok) continue;
            const data = await res.json();
            if (data.coverImage || (data.photos && data.photos.length > 0)) {
              newCovers[album.id] = data.coverImage || data.photos[0].src;
              changed = true;
            }
          } catch {}
        }
      }

      if (changed) {
        setAlbumCovers((prev) => ({ ...prev, ...newCovers }));
      }
    };

    if (effectiveGallery.length > 0) {
      fetchCovers();
    }
  }, [effectiveGallery]);

  // Save a search query text when user searches without selecting an item
  const saveQuerySearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((entry) => {
        if (entry.kind === 'query') {
          return entry.queryText?.toLowerCase() !== clean.toLowerCase();
        }
        return true;
      });
      const newEntry: RecentSearchItem = {
        id: `query-${clean.toLowerCase()}`,
        kind: 'query',
        queryText: clean,
      };
      const updated = [newEntry, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('grace_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Save the selected item and remove the raw query word ("only show the selected item not the search word")
  const saveItemSearch = (item: SearchResultItem, currentQuery?: string) => {
    setRecentSearches((prev) => {
      const cleanQuery = currentQuery?.trim().toLowerCase();
      const filtered = prev.filter((entry) => {
        // Strip the search word if user picked an item
        if (cleanQuery && entry.kind === 'query' && entry.queryText?.toLowerCase() === cleanQuery) {
          return false;
        }
        // Deduplicate this item
        if (entry.kind === 'item' && entry.itemData?.id === item.id) {
          return false;
        }
        return true;
      });

      const isVideo = item.type === 'sermon' || item.type === 'worship' || item.type === 'video';
      const videoId =
        item.type === 'sermon' || item.type === 'worship'
          ? item.raw?.videoId
          : extractYoutubeVideoId(item.raw?.videoUrl || item.raw?.url || '');

      let directHref = item.href;
      if (item.type === 'worship' && videoId && !directHref.includes('?v=')) {
        directHref = `/music?v=${encodeURIComponent(videoId)}`;
      }

      const newEntry: RecentSearchItem = {
        id: `item-${item.id}`,
        kind: 'item',
        itemData: {
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle,
          category: item.category,
          thumbnail: item.thumbnail,
          href: directHref,
          videoId: isVideo ? videoId : undefined,
        },
      };

      const updated = [newEntry, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('grace_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (id: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('grace_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('grace_recent_searches');
    } catch {}
  };

  // Convert and index all data sources into uniform search items
  const indexedItems: { item: SearchResultItem; matchFields: MatchableFields }[] = useMemo(() => {
    const list: { item: SearchResultItem; matchFields: MatchableFields }[] = [];

    // 1. Sermons
    (sermons || []).forEach((s) => {
      const thumb = s.videoId ? youtubeThumbnailUrl(s.videoId) : undefined;
      const subtitle = s.pastor ? `By ${s.pastor}` : undefined;
      list.push({
        item: {
          id: `sermon-${s.id}`,
          type: 'sermon',
          title: s.title,
          subtitle,
          description: s.description,
          date: s.date || (s as any).createdAt,
          category: s.category || 'Sermon',
          thumbnail: thumb,
          href: sermonWatchHref(s),
          score: 0,
          isTypoMatch: false,
          raw: s,
        },
        matchFields: {
          title: s.title,
          subtitle: s.pastor,
          category: s.category || 'Sermon',
          description: s.description,
          meta: [s.pastor, s.date, 'preaching', 'message', 'vachan', 'wachan', 'bachan', 'updesh', 'sandesh', 'kalam', 'prabhu ka vachan', 'shiksha'],
          typeAlias: ['sermon', 'sermons', 'preaching', 'pastor', 'vachan', 'wachan', 'bachan', 'updesh', 'sandesh'],
        },
      });
    });

    // 2. Sermon Series
    (sermonSeries || []).forEach((series) => {
      const seriesSermons = (sermons || []).filter((s) => s.seriesId === series.id);
      const thumb = seriesSermons[0]?.videoId ? youtubeThumbnailUrl(seriesSermons[0].videoId) : undefined;
      list.push({
        item: {
          id: `series-${series.id}`,
          type: 'series',
          title: series.title,
          subtitle: `${seriesSermons.length} Sermon${seriesSermons.length === 1 ? '' : 's'}`,
          description: series.description,
          category: series.category || 'Sermon Series',
          thumbnail: thumb,
          href: `/sermons/series/${series.id}`,
          score: 0,
          isTypoMatch: false,
          raw: series,
        },
        matchFields: {
          title: series.title,
          category: series.category || 'Sermon Series',
          description: series.description,
          meta: ['series', 'sermon series', 'collection', 'vachan mala', 'shrinkhla', 'updesh mala'],
          typeAlias: ['series', 'sermon series', 'collection', 'vachan mala'],
        },
      });
    });

    // 3. Notes (Broadcasts / Handouts)
    const broadcastList = localBroadcasts.length > 0 ? localBroadcasts : (contextBroadcasts || []);
    (broadcastList || []).forEach((note: any) => {
      const matNames = (note.materialLinks || []).map((m: any) => m.label).join(' ');
      list.push({
        item: {
          id: `note-${note.id || note._id}`,
          type: 'note',
          title: note.title,
          subtitle: note.createdByName ? `Shared by ${note.createdByName}` : 'Study Notes',
          description: note.description,
          date: note.createdAt,
          category: 'Notes',
          href: '/broadcasts',
          score: 0,
          isTypoMatch: false,
          raw: note,
        },
        matchFields: {
          title: note.title,
          subtitle: note.createdByName,
          description: note.description,
          category: 'Notes',
          meta: [matNames, 'study notes', 'handout', 'bulletin', 'pdf', 'adhyayan', 'shiksha', 'patra', 'likhit', 'dastavej'],
          typeAlias: ['note', 'notes', 'handout', 'broadcast', 'materials', 'study note', 'adhyayan', 'patra', 'shiksha'],
        },
      });
    });

    // 4. Events
    (events || []).forEach((e) => {
      const locationSub = [e.location, e.time].filter(Boolean).join(' • ');
      list.push({
        item: {
          id: `event-${e.id}`,
          type: 'event',
          title: e.title,
          subtitle: locationSub || undefined,
          description: e.description,
          date: e.date,
          category: e.category || 'Event',
          thumbnail: e.image || undefined,
          href: '/events',
          score: 0,
          isTypoMatch: false,
          raw: e,
        },
        matchFields: {
          title: e.title,
          subtitle: e.location,
          category: e.category || 'Event',
          description: e.description,
          meta: [e.location, e.date, e.time, 'upcoming event', 'karyakram', 'utsav', 'sangati', 'sabha', 'milan', 'samagam', 'sewa'],
          typeAlias: ['event', 'events', 'gathering', 'service', 'meeting', 'karyakram', 'utsav', 'sangati', 'sabha'],
        },
      });
    });

    // 5. Announcements
    (announcements || []).forEach((a) => {
      list.push({
        item: {
          id: `ann-${a.id}`,
          type: 'announcement',
          title: a.title,
          subtitle: a.createdAt ? formatDDMMYYYY(a.createdAt) : undefined,
          description: a.content,
          date: a.createdAt,
          category: 'Announcement',
          thumbnail: a.image || undefined,
          href: '/announcements',
          score: 0,
          isTypoMatch: false,
          raw: a,
        },
        matchFields: {
          title: a.title,
          description: a.content,
          category: 'Announcement',
          meta: ['news', 'church notice', 'announcement', 'update', 'suchna', 'sochna', 'samachar', 'ghoshna', 'khabar', 'suchana'],
          typeAlias: ['announcement', 'announcements', 'news', 'notice', 'update', 'suchna', 'sochna', 'samachar'],
        },
      });
    });

    // 6. Worship Videos (Songs)
    (worshipVideos || []).forEach((v) => {
      const thumb = v.videoId ? youtubeThumbnailUrl(v.videoId) : undefined;
      const subtitle = v.artist ? `By ${v.artist}` : (v.categories?.[0] || 'Worship Video');
      list.push({
        item: {
          id: `worship-${v.id}`,
          type: 'worship',
          title: v.title,
          subtitle,
          date: (v as any).date || (v as any).createdAt,
          category: v.categories?.[0] || 'Worship',
          thumbnail: thumb,
          href: v.videoId ? `/music?v=${encodeURIComponent(v.videoId)}` : '/music',
          score: 0,
          isTypoMatch: false,
          raw: v,
        },
        matchFields: {
          title: v.title,
          subtitle: v.artist,
          category: (v.categories || []).join(' ') || 'Worship',
          meta: [v.artist || '', v.album || '', ...(v.categories || []), 'song', 'praise', 'worship video', 'music', 'aradhna', 'aaradhna', 'aradhana', 'stuti', 'mahima', 'geet', 'gana', 'gaana', 'bhajan'],
          typeAlias: ['worship', 'worship video', 'song', 'music', 'praise', 'bhajan', 'geet', 'aradhna', 'aradhana', 'aaradhna', 'stuti', 'gana'],
        },
      });
    });

    // 7. Gallery Albums: Individual YouTube Videos & Photos
    effectiveGallery.forEach((album) => {
      const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
      const isVideo = album.mediaType === 'videos' || Boolean(album.videoUrl) || Boolean(ytId);
      const isBoth = album.mediaType === 'both';
      const cover = albumCovers[album.id] || album.coverImage || (ytId ? youtubeThumbnailUrl(ytId) : undefined);
      const albumDate = album.createdAt || (album as any).date;

      const rawCat = album.category?.trim();
      const hasCustomCat = Boolean(rawCat && rawCat.toLowerCase() !== 'general');

      if (isVideo || isBoth) {
        const displayCategory = hasCustomCat ? rawCat! : (isBoth ? 'Video & Photos' : 'Video');
        const defaultSub = album.description || (albumDate ? formatDDMMYYYY(albumDate) : displayCategory);
        const subtitle = isBoth
          ? (hasCustomCat ? `${rawCat} • Video & Photos` : 'Video & Photos')
          : (hasCustomCat ? `${rawCat} • Video` : defaultSub);

        list.push({
          item: {
            id: `gallery-video-${album.id}`,
            type: 'video',
            title: album.title,
            subtitle,
            description: album.description,
            date: albumDate,
            category: displayCategory,
            thumbnail: cover,
            href: `/gallery?album=${album.id}`,
            score: 0,
            isTypoMatch: false,
            raw: album,
          },
          matchFields: {
            title: album.title,
            category: displayCategory,
            description: album.description,
            meta: [album.category || '', 'video', 'youtube video', 'watch', 'recording', 'chalchitra', 'drishya'],
            typeAlias: ['video', 'videos', 'youtube', 'gallery video', 'clip', 'chalchitra'],
          },
        });
      }

      if (!isVideo || isBoth) {
        const displayCategory = hasCustomCat ? rawCat! : (isBoth ? 'Photos & Video' : 'Photos');
        const defaultSub = album.description || (albumDate ? formatDDMMYYYY(albumDate) : (isBoth ? 'Photos & Video' : 'Photo Album'));
        const subtitle = isBoth
          ? (hasCustomCat ? `${rawCat} • Photos & Video` : 'Photos & Video')
          : (hasCustomCat ? `${rawCat} • Photo Album` : defaultSub);

        list.push({
          item: {
            id: `gallery-photo-${album.id}`,
            type: 'photo',
            title: album.title,
            subtitle,
            description: album.description,
            date: albumDate,
            category: displayCategory,
            thumbnail: cover,
            href: `/gallery?album=${album.id}`,
            score: 0,
            isTypoMatch: false,
            raw: album,
          },
          matchFields: {
            title: album.title,
            category: displayCategory,
            description: album.description,
            meta: [album.category || '', 'photos', 'album', 'google photos', 'pictures', 'gallery', 'tasveer', 'tasveere', 'tasveerein', 'tasvir', 'chitra'],
            typeAlias: ['photo', 'photos', 'album', 'gallery album', 'pictures', 'tasveer', 'tasveere', 'tasvir', 'chitra'],
          },
        });
      }
    });

    // 8. Prayer Requests
    effectivePrayers.forEach((pr) => {
      list.push({
        item: {
          id: `prayer-${pr.id || (pr as any)._id}`,
          type: 'note',
          title: pr.title || 'Prayer Request',
          subtitle: pr.authorName ? `By ${pr.authorName}` : 'Prayer Wall',
          description: pr.content,
          date: pr.createdAt,
          category: 'Prayer',
          href: '/prayer-wall',
          score: 0,
          isTypoMatch: false,
          raw: pr,
        },
        matchFields: {
          title: pr.title || 'Prayer Request',
          subtitle: pr.authorName,
          category: 'Prayer',
          description: pr.content,
          meta: ['prayer', 'pray', 'prarthna', 'prarthana', 'prathna', 'dua', 'binti', 'vinati', 'prayer wall', 'intercession'],
          typeAlias: ['prayer', 'prarthna', 'prarthana', 'prathna', 'dua', 'binti', 'vinati'],
        },
      });
    });

    return list;
  }, [sermons, sermonSeries, localBroadcasts, contextBroadcasts, events, announcements, worshipVideos, effectiveGallery, albumCovers, effectivePrayers]);

  // Live Streams Status & Campus detection
  const liveCampusStreams = useMemo(() => {
    return (liveStreams || []).filter((s: any) => Boolean(s.isLive));
  }, [liveStreams]);

  const isAnyCampusLive = liveCampusStreams.length > 0;

  // Compile Instagram Explore Feed: Sorted strictly chronologically with newest posted first
  const exploreFeedItems: ExploreFeedItem[] = useMemo(() => {
    const items: ExploreFeedItem[] = [];

    indexedItems.forEach(({ item }) => {
      let timestamp = 0;
      if (item.raw) {
        if (item.type === 'photo' || item.type === 'video') {
          const albumT = getAlbumTimestamp(item.raw);
          if (albumT > 0) timestamp = albumT;
        }
        if (!timestamp && item.raw.createdAt) {
          const t = new Date(item.raw.createdAt).getTime();
          if (!isNaN(t) && t > 0) timestamp = t;
        }
        if (!timestamp && item.raw.date) {
          const t = new Date(item.raw.date).getTime();
          if (!isNaN(t) && t > 0) timestamp = t;
        }
      }
      if (!timestamp && item.date) {
        const t = new Date(item.date).getTime();
        if (!isNaN(t) && t > 0) timestamp = t;
      }

      let videoId: string | undefined = undefined;
      if (item.type === 'sermon') videoId = item.raw?.videoId;
      else if (item.type === 'worship') videoId = item.raw?.videoId;
      else if (item.type === 'video') videoId = extractYoutubeVideoId(item.raw?.videoUrl || item.raw?.url) || undefined;

      // Realtime resolved cover image
      let thumb = item.thumbnail;
      if ((item.type === 'photo' || item.type === 'video') && item.raw?.id && albumCovers[item.raw.id]) {
        thumb = albumCovers[item.raw.id];
      }

      items.push({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: sanitizeSubtitle(item.subtitle),
        description: item.description,
        date: item.date,
        timestamp,
        timeAgo: formatRelativeTime(timestamp),
        category: sanitizeCategory(item.category, item.type === 'video' ? 'Video' : item.type === 'photo' ? 'Photos' : item.type),
        thumbnail: thumb,
        href: item.href,
        isNew: false,
        videoId,
        raw: item.raw,
      });
    });

    // Sort strictly by newest first (descending timestamp)
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Tag top 10 items or anything posted in the last 14 days as 'isNew'
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return items.map((it, idx) => ({
      ...it,
      isNew: idx < 8 || (it.timestamp > 0 && it.timestamp >= fourteenDaysAgo),
    }));
  }, [indexedItems, albumCovers]);

  // Just In & Recently Posted Feed Items (Filtered by activeTab, newest first)
  const freshReleases = useMemo(() => {
    if (activeTab === 'all') return exploreFeedItems;
    if (activeTab === 'live') return [];
    return exploreFeedItems.filter((item) => item.type === activeTab);
  }, [exploreFeedItems, activeTab]);

  // Execute fuzzy search when query is typed
  const { results, counts, hasTypoCorrection, totalCount } = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        results: [],
        counts: {} as Record<string, number>,
        hasTypoCorrection: false,
        totalCount: 0,
      };
    }

    const scoredList: SearchResultItem[] = [];
    let detectedTypo = false;

    indexedItems.forEach(({ item, matchFields }) => {
      try {
        const match = scoreItem(trimmed, matchFields);
        if (match.isMatch) {
          if (match.isTypoMatch) detectedTypo = true;
          scoredList.push({
            ...item,
            score: match.score,
            isTypoMatch: match.isTypoMatch,
          });
        }
      } catch (err) {
        console.error("Error scoring item for query:", item?.title, err);
      }
    });

    scoredList.sort((a, b) => b.score - a.score);

    const countMap: Record<string, number> = {
      all: scoredList.length,
      live: isAnyCampusLive ? 1 : 0,
      sermon: 0,
      note: 0,
      worship: 0,
      video: 0,
      photo: 0,
      event: 0,
      series: 0,
      announcement: 0,
    };

    scoredList.forEach((res) => {
      if (countMap[res.type] !== undefined) {
        countMap[res.type]++;
      }
    });

    const filtered = activeTab === 'all' ? scoredList : activeTab === 'live' ? [] : scoredList.filter((r) => r.type === activeTab);

    return {
      results: filtered,
      counts: countMap,
      hasTypoCorrection: detectedTypo,
      totalCount: scoredList.length,
    };
  }, [query, indexedItems, activeTab, isAnyCampusLive]);

  const handleSelectSuggestion = (term: string) => {
    setQuery(term);
    saveQuerySearch(term);
  };

  const handleClear = () => {
    setQuery('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Campus story list
  const campusStories = useMemo(() => {
    const allCampuses = campuses && campuses.length > 0 ? campuses : [{ id: 'main', name: 'Main Campus' }];
    return allCampuses.map((c) => {
      const liveStream = liveStreams.find((ls: any) => ls.campusId === c.id && ls.isLive);
      return {
        id: c.id,
        name: c.name,
        isLive: Boolean(liveStream),
        liveStream,
      };
    });
  }, [campuses, liveStreams]);

  return (
    <div className="min-h-screen bg-transparent pb-28">
      {/* Sticky Header & Search Bar */}
      <div className="sticky top-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-xl border-b border-[#E5D5C5]/60 shadow-sm pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (isFocused || query.trim()) {
                setIsFocused(false);
                setQuery('');
                inputRef.current?.blur();
              } else {
                router.back();
              }
            }}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E5D5C5]/80 flex items-center justify-center text-[#7A6150] shadow-xs shrink-0 active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B2323]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  saveQuerySearch(query);
                }
              }}
              placeholder="Search sermons, notes, events, videos, photos..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E5D5C5]/80 rounded-2xl text-sm shadow-xs outline-none focus:border-[#8B2323]/50 focus:ring-3 focus:ring-[#8B2323]/10 font-medium text-[#1A202C] placeholder:text-[#7A6150]/60 transition-all"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF7F2] hover:bg-[#FBE8E8] text-[#7A6150] hover:text-[#8B2323] flex items-center justify-center transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instagram-style Cancel Button */}
          {isFocused && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsFocused(false);
                setQuery('');
                inputRef.current?.blur();
              }}
              className="text-xs font-semibold text-[#8B2323] hover:text-[#701C1C] transition-colors shrink-0 px-1 py-1"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Explore & Category Filter Pills - Hidden when focusing search without query */}
        {(!isFocused || Boolean(query.trim())) && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3 -mx-4 px-4 snap-x">
          {CATEGORY_TABS.map((tab) => {
            const count = counts[tab.id] || 0;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all snap-start shrink-0 ${
                  isSelected
                    ? 'bg-[#8B2323] text-white shadow-xs'
                    : 'bg-white/80 text-[#7A6150] hover:bg-white border border-[#E5D5C5]/60 hover:text-[#1A202C]'
                }`}
              >
                <span>{tab.label}</span>
                {query.trim() && count > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#8B2323]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="px-4 pt-3 max-w-4xl mx-auto space-y-5">
        {/* Typo & Hinglish Correction Banner in search mode */}
        {query.trim() && hasTypoCorrection && totalCount > 0 && (
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5] text-[#7A6150] text-xs font-medium flex items-center gap-2 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#8B2323] shrink-0" />
            <span>
              Showing results for <strong className="text-[#1A202C]">"{query}"</strong> (including close matches & Hinglish)
            </span>
          </div>
        )}

        {/* =========================================================================
            INSTAGRAM RECENT SEARCHES SCREEN (When search bar is focused & query is empty)
            ========================================================================= */}
        {isFocused && !query.trim() ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-sm text-[#1A202C]">Recent</span>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearRecentSearches}
                  className="text-xs font-semibold text-[#8B2323] hover:underline transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {recentSearches.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 rounded-full bg-white border border-[#E5D5C5]/60 text-[#7A6150]/60 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                  <SearchIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#7A6150]">No recent searches</p>
                <p className="text-[11px] text-[#7A6150]/70 mt-0.5">Searches you perform will show up here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5D5C5]/40 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E5D5C5]/60 p-1.5 shadow-xs">
                {recentSearches.map((entry) => {
                  // Case 1: Unselected Search Query (shows only the search text and X button)
                  if (entry.kind === 'query' && entry.queryText) {
                    const term = entry.queryText;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2.5 px-3 hover:bg-[#FAF7F2] active:bg-[#FAF7F2] transition-colors rounded-xl group cursor-pointer"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestion(term)}
                      >
                        <span className="text-sm font-medium text-[#1A202C] truncate group-hover:text-[#8B2323] transition-colors">
                          {term}
                        </span>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(entry.id);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#7A6150]/60 hover:text-[#1A202C] hover:bg-black/5 active:scale-95 transition-all shrink-0 -mr-1"
                          aria-label={`Remove ${term}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }

                  // Case 2: Selected Item (shows selected item card directly with thumbnail/details)
                  if (entry.kind === 'item' && entry.itemData) {
                    const item = entry.itemData;
                    const isVideo = Boolean(item.videoId);

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2 px-2 hover:bg-[#FAF7F2] active:bg-[#FAF7F2] transition-colors rounded-xl group cursor-pointer"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          let dest = item.href || '/';
                          if (item.type === 'worship' && item.videoId && !dest.includes('?v=')) {
                            dest = `/music?v=${encodeURIComponent(item.videoId)}`;
                          }
                          router.push(dest);
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#FAF7F2] border border-[#E5D5C5]/80 shrink-0 flex items-center justify-center">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#FFF5F5] flex items-center justify-center text-[#8B2323]">
                                <SearchIcon className="w-4 h-4" />
                              </div>
                            )}
                            {isVideo && (
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-white/95 text-[#8B2323] flex items-center justify-center pl-0.5">
                                  <Play className="w-2 h-2 fill-current" />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#1A202C] truncate group-hover:text-[#8B2323] transition-colors leading-snug">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#7A6150]/70 truncate">
                              {sanitizeSubtitle(item.subtitle) || sanitizeCategory(item.category) || item.type}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(entry.id);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#7A6150]/60 hover:text-[#1A202C] hover:bg-black/5 active:scale-95 transition-all shrink-0"
                          aria-label={`Remove ${item.title}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        ) : !query.trim() ? (
          <div className="space-y-4 pt-1">
            {freshReleases.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-[#E5D5C5]/60 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8B2323] flex items-center justify-center mx-auto mb-3">
                  <SearchIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#3A2D27]">No posts in this category</h4>
                <p className="text-xs text-[#7A6150] mt-1">Check back later or browse All.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#8B2323]" />
                    <h3 className="text-xs font-bold text-[#4A3A32] uppercase tracking-wider">
                      Just In & Recently Posted
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#8B2323] bg-[#FBE8E8] px-2.5 py-0.5 rounded-full border border-[#8B2323]/15 flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    Newest First
                  </span>
                </div>

                <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 pt-1 snap-x scroll-smooth items-stretch">
                  {freshReleases.map((item) => {
                    const isVideo = item.type === 'sermon' || item.type === 'worship' || item.type === 'video';
                    return (
                      <div
                        key={`fresh-${item.id}`}
                        onClick={() => {
                          let dest = item.href || '/';
                          if (item.type === 'worship' && item.videoId && !dest.includes('?v=')) {
                            dest = `/music?v=${encodeURIComponent(item.videoId)}`;
                          }
                          router.push(dest);
                        }}
                        className="group relative w-44 sm:w-48 h-[272px] shrink-0 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl border border-[#E5D5C5]/60 bg-[#FAF7F2] snap-start cursor-pointer active:scale-98 transition-all duration-300 flex flex-col select-none"
                      >
                        {item.thumbnail ? (
                          <div className="relative w-full h-full overflow-hidden flex flex-col justify-between">
                            {/* Full-bleed Background Poster Image */}
                            <div className="absolute inset-0 bg-[#2D231E]/20 overflow-hidden">
                              <img
                                src={cleanThumbnailUrl(item.thumbnail)}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (target.src.includes('hqdefault.jpg')) {
                                    target.src = target.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                                  }
                                }}
                              />
                            </div>

                            {/* Top Subtle Scrim Gradient */}
                            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none z-10" />

                            {/* Bottom Rich Scrim Gradient */}
                            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/95 via-black/65 via-45% to-transparent pointer-events-none z-10" />

                            {/* Top Header Row: Badges */}
                            <div className="relative z-20 p-3 flex items-center justify-between gap-1.5">
                              {item.isNew ? (
                                <span className="bg-[#8B2323] text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  NEW
                                </span>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-1">
                                {item.type === 'photo' && (
                                  <span className="bg-black/45 backdrop-blur-md text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shadow-xs">
                                    <Copy className="w-2.5 h-2.5" />
                                    Photos
                                  </span>
                                )}
                                {isVideo && (
                                  <span className="bg-black/45 backdrop-blur-md text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shadow-xs">
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    {sanitizeCategory(item.category, item.type === 'worship' ? 'Worship' : 'Video')}
                                  </span>
                                )}
                                {!isVideo && item.type !== 'photo' && item.category && (
                                  <span className="bg-black/45 backdrop-blur-md text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Center Floating Play Button (for Videos/Music) */}
                            {isVideo && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                                <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 text-white flex items-center justify-center pl-0.5 shadow-xl group-hover:scale-115 group-hover:bg-[#8B2323] group-hover:border-[#8B2323] transition-all duration-300">
                                  <Play className="w-5 h-5 fill-current drop-shadow-sm" />
                                </div>
                              </div>
                            )}

                            {/* Bottom Content Area */}
                            <div className="relative z-20 p-3 mt-auto flex flex-col justify-end text-white">
                              <div className="flex items-center justify-between text-[10px] font-medium text-white/75 mb-1">
                                <span className="truncate max-w-[65%] text-white/80 font-semibold uppercase tracking-wider text-[9px]">
                                  {sanitizeSubtitle(item.subtitle) || sanitizeCategory(item.category, item.type === 'video' ? 'Video' : item.type === 'worship' ? 'Worship' : '')}
                                </span>
                                {item.timeAgo && (
                                  <span className="shrink-0 text-white/70 text-[9.5px]">{item.timeAgo}</span>
                                )}
                              </div>

                              <h4 className="font-bold text-[13px] text-white line-clamp-2 leading-snug group-hover:text-red-200 transition-colors drop-shadow-sm">
                                {item.title}
                              </h4>

                              {item.description && (
                                <p className="text-[10.5px] text-white/70 line-clamp-1 mt-1 font-normal">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const theme = getEditorialCardTheme(item.type);
                            const CardIcon = theme.icon;

                            return (
                              <div className="relative w-full h-full p-3.5 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] via-[#FAF4EC] to-[#F5ECE1] overflow-hidden select-none">
                                {/* Background Decorative Watermark Icon */}
                                <div className="absolute -right-3 -bottom-3 text-[#8B2323]/[0.06] pointer-events-none transform -rotate-12">
                                  <CardIcon className="w-28 h-28 stroke-[1.1]" />
                                </div>

                                {/* Top Header Row */}
                                <div className="relative z-10 flex items-center justify-between gap-1.5">
                                  {item.isNew ? (
                                    <span className="bg-[#8B2323] text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      NEW
                                    </span>
                                  ) : (
                                    <span />
                                  )}

                                  <span className="bg-[#8B2323]/10 text-[#8B2323] border border-[#8B2323]/20 text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CardIcon className="w-2.5 h-2.5" />
                                    {sanitizeCategory(item.category, item.type === 'announcement' ? 'Notice' : item.type === 'note' ? 'Prayer' : 'Event')}
                                  </span>
                                </div>

                                {/* Middle Content */}
                                <div className="relative z-10 my-auto py-2">
                                  <h4 className="font-serif font-bold text-[14.5px] text-[#2D231E] leading-snug line-clamp-3 group-hover:text-[#8B2323] transition-colors">
                                    {item.title}
                                  </h4>

                                  {item.description && (
                                    <p className="text-[11px] text-[#7A6150] line-clamp-3 leading-relaxed mt-2 font-normal">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                {/* Bottom Footer: Subtitle / Date & Action Link */}
                                <div className="relative z-10 pt-2 border-t border-[#E5D5C5]/70 flex items-center justify-between gap-1 text-[#7A6150]">
                                  <span className="text-[10px] font-semibold text-[#7A6150]/80 truncate">
                                    {item.timeAgo || (item.date ? formatDDMMYYYY(item.date) : '')}
                                  </span>
                                  <span className="inline-flex items-center text-[10.5px] font-bold text-[#8B2323] group-hover:translate-x-0.5 transition-transform shrink-0">
                                    {theme.readText}
                                    <ChevronRight className="w-3 h-3 ml-0.5" />
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : totalCount === 0 ? (
          /* =========================================================================
             NO SEARCH RESULTS STATE
             ========================================================================= */
          <div className="flex flex-col items-center justify-center pt-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FBE8E8] flex items-center justify-center mb-4 text-[#8B2323]">
              <SearchIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#3A2D27]">No results found</h3>
            <p className="text-xs text-[#7A6150] max-w-sm mt-1.5 leading-relaxed">
              We couldn't find any items matching <strong>"{query}"</strong>. Try checking your keywords or browsing through another tab.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {POPULAR_SUGGESTIONS.slice(0, 4).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="px-3 py-1 rounded-xl bg-white border border-[#E5D5C5] text-xs font-medium text-[#7A6150] hover:text-[#8B2323]"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* =========================================================================
             SEARCH RESULTS LIST VIEW (Typo-Tolerant & Filtered)
             ========================================================================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#7A6150]">
              <span className="font-bold">
                Found {results.length} result{results.length === 1 ? '' : 's'}
                {activeTab !== 'all' && ` in ${CATEGORY_TABS.find((t) => t.id === activeTab)?.label}`}
              </span>
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  onSelect={() => saveItemSearch(result, query)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result Card Component
// ---------------------------------------------------------------------------
function SearchResultCard({
  result,
  onSelect,
}: {
  result: SearchResultItem;
  onSelect: () => void;
}) {
  const getBadgeConfig = (type: SearchItemType) => {
    switch (type) {
      case 'sermon':
        return { label: 'Sermon', color: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/25', icon: BookOpen };
      case 'series':
        return { label: 'Series', color: 'bg-[#FAF7F2] text-[#8B2323] border-[#E5D5C5]', icon: Layers };
      case 'note':
        return { label: 'Note', color: 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]', icon: FileText };
      case 'worship':
        return { label: 'Worship Video', color: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/25', icon: Music };
      case 'video':
        return { label: 'Video', color: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/20', icon: Film };
      case 'photo':
        return { label: 'Photos', color: 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]', icon: ImageIcon };
      case 'event':
        return { label: 'Event', color: 'bg-[#FFF5F5] text-[#8B2323] border-[#8B2323]/25', icon: Calendar };
      case 'announcement':
        return { label: 'Announcement', color: 'bg-[#FEF3C7]/80 text-[#92400E] border-[#FDE68A]', icon: Bell };
      default:
        return { label: 'Item', color: 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]', icon: SearchIcon };
    }
  };

  const badge = getBadgeConfig(result.type) || { label: 'Item', color: 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]', icon: SearchIcon };
  const BadgeIcon = badge.icon || SearchIcon;
  const isVideo = result.type === 'sermon' || result.type === 'worship' || result.type === 'video';
  const videoId =
    result.type === 'sermon' || result.type === 'worship'
      ? result.raw?.videoId
      : extractYoutubeVideoId(result.raw?.videoUrl || result.raw?.url || '');

  let targetHref = result.href || '/';
  if (result.type === 'worship' && videoId && !targetHref.includes('?v=')) {
    targetHref = `/music?v=${encodeURIComponent(videoId)}`;
  } else if (result.type === 'sermon' && videoId && (!result.href || result.href === '/sermons')) {
    const sId = result.raw?.id || result.id?.replace(/^sermon-/, '');
    if (sId) {
      targetHref = `/sermons?sermon=${encodeURIComponent(sId)}`;
    }
  }

  const isValidDate = result.date ? !isNaN(new Date(result.date).getTime()) : false;

  return (
    <Link
      href={targetHref}
      onClick={onSelect}
      className="block text-inherit no-underline"
    >
      <Card className="p-3.5 border border-[#E5D5C5]/70 shadow-xs bg-white/95 hover:bg-white hover:border-[#8B2323]/35 hover:shadow-sm active:scale-[0.99] rounded-xl flex items-center gap-3.5 transition-all group cursor-pointer">
        {/* Left Visual: Thumbnail, Calendar Badge, or Media Icon */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#FAF7F2] shrink-0 border border-[#E5D5C5]/60 flex items-center justify-center">
          {result.thumbnail ? (
            <>
              <img
                src={result.thumbnail}
                alt={result.title || 'Item'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {isVideo && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/95 text-[#8B2323] flex items-center justify-center pl-0.5 shadow-xs">
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              )}
            </>
          ) : result.type === 'event' && isValidDate ? (
            <div className="flex flex-col items-center justify-center w-full h-full bg-[#FFF5F5] border border-[#8B2323]/10">
              <span className="text-base font-bold text-[#8B2323] leading-none">
                {new Date(result.date!).getDate()}
              </span>
              <span className="text-[10px] font-bold text-[#8B2323] mt-0.5 uppercase tracking-wide">
                {new Date(result.date!).toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#FFF5F5] to-[#FAF7F2] flex items-center justify-center text-[#8B2323]">
              <BadgeIcon className="w-6 h-6 text-[#8B2323]" strokeWidth={1.75} />
            </div>
          )}
        </div>

        {/* Center Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${badge.color}`}
            >
              <BadgeIcon className="w-2.5 h-2.5" />
              <span>{badge.label}</span>
            </span>

            {result.category && result.category !== badge.label && result.category.toLowerCase() !== 'general' && (
              <span className="text-[10px] text-[#7A6150] font-medium truncate max-w-[130px]">
                • {result.category}
              </span>
            )}
          </div>

          <h4 className="font-bold text-sm text-[#1A202C] truncate group-hover:text-[#8B2323] transition-colors leading-snug">
            {result.title}
          </h4>

          {result.subtitle && sanitizeSubtitle(result.subtitle) && (
            <p className="text-xs text-[#7A6150] truncate mt-0.5 font-medium">
              {sanitizeSubtitle(result.subtitle)}
            </p>
          )}

          {result.description && !result.subtitle && (
            <p className="text-xs text-[#7A6150]/80 line-clamp-1 mt-0.5 leading-relaxed">
              {result.description}
            </p>
          )}
        </div>

        {/* Right Action Chevron */}
        <div className="shrink-0 p-1 text-[#7A6150]/40 group-hover:text-[#8B2323] group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </Card>
    </Link>
  );
}
