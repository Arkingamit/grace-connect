"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Heart, Music, Calendar, BookOpen, Share2, MapPin, Clock, ChevronRight, ChevronLeft, User, Play, Sparkles, ArrowRight, Image as ImageIcon, Megaphone, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminData, type FlipCardItem } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { GUEST_HIGHLIGHT_CARD } from '@/lib/hooks/use-system';
import { contentToHighlightItems, mergeHighlightItems, isManualHighlightVisible } from '@/lib/highlight-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveStreamSection } from '@/components/ui/live-stream';
import { CampusDetails } from '@/components/ui/campus-details';
import { AnnouncementsSection } from '@/components/ui/announcements-section';
import { NoteShareSection } from '@/components/ui/note-share-section';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { AuthGate } from '@/components/ui/auth-gate';
import { ProfileSwitcher } from '@/components/ui/profile-switcher';
import { getMapsUrl } from '@/lib/maps';
import { MapsPinIcon } from '@/components/ui/maps-pin-icon';

const christianIcons = [
  // Cross
  <svg key="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary animate-pulse"><path d="M12 3v18M8 8h8" /></svg>,
  // Dove
  <svg key="dove" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary animate-pulse"><path d="M15 4c-3 0-6 4-6 4S7 7 4 8c0 0 4 2 4 5 0 3-4 6-4 6s6-3 8-3c2 0 6 3 6 3 0-3-2-6-2-6s2-3 2-5c0-2-3-4-3-4z" /></svg>,
  // Crown
  <svg key="crown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary animate-pulse"><path d="M2 20h20M4 20l2-10 4 5 2-8 2 8 4-5 2 10" /></svg>,
  // Open Bible / Book
  <svg key="bible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary animate-pulse"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
  // Fire / Holy Spirit
  <svg key="fire" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary animate-pulse"><path d="M12 22c5 0 9-4 9-9 0-4-3-6-5-9-1-1-2-2-4-2s-3 1-4 2c-2 3-5 5-5 9 0 5 4 9 9 9z M12 22v-6" /></svg>
];

const cardGradients = [
  "from-[#8B2323]/15 via-white to-[#A04A00]/15",
  "from-[#721515]/15 via-white to-[#3A0A0A]/15",
  "from-[#A04A00]/15 via-white to-[#8B2323]/15",
];

function AnimatedNumber({ end, duration = 2000, delay = 0, suffix = "" }: { end: number, duration?: number, delay?: number, suffix?: string }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const timeoutId = setTimeout(() => {
      const animate = (time: number) => {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOut * end));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, delay]);

  return <>{count.toLocaleString()}{suffix}</>;
}

// ─── Highlights Morphing Card Stack ───────────────────────────────────────────
interface HighlightsCardStackProps {
  allCards: { type: string; id: string; data: any; tag: string }[];
  activeIdx: number;
  setActiveIdx: React.Dispatch<React.SetStateAction<number>>;
  verse: { text: string; reference: string };
  christianIcons: React.ReactNode[];
  getDisplayDetails: (item: any) => { displayTitle: string; displayDesc: string; displayBtn: string; displayLink: string };
}

function HighlightsCardStack({
  allCards,
  activeIdx,
  setActiveIdx,
  verse,
  christianIcons,
  getDisplayDetails,
}: HighlightsCardStackProps) {
  const totalCards = allCards.length;
  const stackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragOffset = useRef(0);
  const [renderTick, setRenderTick] = useState(0);

  const SWIPE_THRESHOLD = 60;
  const STACK_HEIGHT = 340;

  const setActive = useCallback((i: number) => {
    setActiveIdx(((i % totalCards) + totalCards) % totalCards);
  }, [totalCards, setActiveIdx]);

  const animateSwipe = useCallback((dir: number) => {
    const start = dragOffset.current;
    const target = dir * 320;
    const startTime = performance.now();
    const duration = 280;

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      dragOffset.current = start + (target - start) * eased;
      setRenderTick(v => v + 1);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        dragOffset.current = 0;
        setActive(activeIdx + (dir === -1 ? 1 : -1));
      }
    }
    requestAnimationFrame(tick);
  }, [activeIdx, setActive]);

  const goNext = useCallback(() => animateSwipe(-1), [animateSwipe]);
  const goPrev = useCallback(() => animateSwipe(1), [animateSwipe]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Auto-advance timer (2.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isDragging.current) {
        goNext();
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [goNext]);

  // Compute card transforms
  const getCardStyle = useCallback((i: number): React.CSSProperties => {
    let pos = i - activeIdx;
    if (pos > totalCards / 2) pos -= totalCards;
    if (pos < -totalCards / 2) pos += totalCards;

    const absPos = Math.abs(pos);
    let translateX = 0, translateY = 0, scale = 1, rotate = 0, opacity = 1;
    const zIndex = 10 - absPos;

    if (pos === 0) {
      translateX = dragOffset.current;
      scale = 1;
      rotate = dragOffset.current * 0.03;
      opacity = 1 - Math.min(Math.abs(dragOffset.current) / 300, 0.3);
    } else if (pos > 0) {
      translateX = pos * 14;
      translateY = pos * -8;
      scale = 1 - pos * 0.06;
      rotate = pos * 2;
      opacity = pos > 2 ? 0 : 1 - pos * 0.15;
    } else {
      translateX = pos * 14;
      translateY = Math.abs(pos) * -8;
      scale = 1 - absPos * 0.06;
      rotate = pos * 2;
      opacity = absPos > 2 ? 0 : 1 - absPos * 0.15;
    }

    return {
      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      zIndex,
      pointerEvents: pos === 0 ? 'auto' as const : 'none' as const,
      transition: isDragging.current ? 'none' : 'transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease',
      position: 'absolute' as const,
      inset: 0,
      willChange: 'transform',
    };
  }, [activeIdx, totalCards]);

  // Touch handlers for drag — using touch events so that touch-action: pan-y
  // lets the browser handle vertical scrolling natively.
  const startY = useRef(0);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const DIRECTION_THRESHOLD = 10; // px movement before locking direction

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDragging.current = false;
    directionLocked.current = null;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    dragOffset.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // If already locked to vertical, do nothing — browser is scrolling
    if (directionLocked.current === 'vertical') return;

    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // If direction not yet decided, check thresholds
    if (directionLocked.current === null) {
      if (Math.abs(dx) < DIRECTION_THRESHOLD && Math.abs(dy) < DIRECTION_THRESHOLD) {
        return; // not enough movement to decide
      }
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical gesture — let the browser scroll normally
        directionLocked.current = 'vertical';
        return;
      }
      // Horizontal gesture — we'll handle this
      directionLocked.current = 'horizontal';
      isDragging.current = true;
    }

    // Horizontal drag in progress — prevent scroll and update offset
    if (isDragging.current) {
      e.preventDefault();
      dragOffset.current = dx;
      setRenderTick(t => t + 1);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    directionLocked.current = null;
    if (!isDragging.current) return;
    isDragging.current = false;
    const offset = dragOffset.current;
    const velocity = Math.abs(offset);

    if (offset < -SWIPE_THRESHOLD || (offset < -20 && velocity > 80)) {
      animateSwipe(-1);
    } else if (offset > SWIPE_THRESHOLD || (offset > 20 && velocity > 80)) {
      animateSwipe(1);
    } else {
      dragOffset.current = 0;
      setRenderTick(t => t + 1);
    }
  }, [animateSwipe]);

  // Build stacked card elements
  const renderCardContent = (item: typeof allCards[0], originalIndex: number, isTop: boolean) => {
    const gradientClass = cardGradients[originalIndex % cardGradients.length];

    if (item.type === 'verse') {
      return (
        <div className={`highlights-stack-card ${isTop ? 'is-top' : ''} bg-card bg-gradient-to-br ${gradientClass} rounded-3xl p-6 h-full flex flex-col justify-between border border-border w-full relative overflow-hidden`}>
          <span className={`highlights-accent-bar ${isTop ? 'is-active' : ''}`} />
          <span className="highlights-watermark">01</span>

          <div className="flex items-start gap-3 relative z-10">
            <div className="highlights-icon-tile">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="highlights-tag">{item.tag}</span>
              <h3 className="font-serif text-xl mt-1.5 leading-tight font-bold text-foreground">Daily Verse</h3>
            </div>
          </div>

          <div className="my-auto py-4 relative z-10">
            <p className="text-lg font-serif italic text-foreground/85 leading-relaxed line-clamp-4">
              &ldquo;{item.data.text}&rdquo;
            </p>
            <p className="text-right text-muted-foreground font-semibold text-sm mt-2">
              — {item.data.reference}
            </p>
          </div>
        </div>
      );
    }

    // Admin card
    const { displayTitle, displayDesc, displayBtn, displayLink } = getDisplayDetails(item.data);
    const cardIdx = String(originalIndex + 1).padStart(2, '0');

    return (
      <Card className={`highlights-stack-card ${isTop ? 'is-top' : ''} p-6 w-full h-full border border-border flex flex-col justify-between bg-card bg-gradient-to-br ${gradientClass} rounded-3xl overflow-hidden relative`}>
        <span className={`highlights-accent-bar ${isTop ? 'is-active' : ''}`} />
        <span className="highlights-watermark">{cardIdx}</span>

        <div className="flex items-start gap-3 relative z-10">
          <div className="highlights-icon-tile">
            {christianIcons[originalIndex % christianIcons.length]}
          </div>
          <div className="flex-1 min-w-0">
            <span className="highlights-tag">{item.tag}</span>
            <h3 className="font-serif text-xl mt-1.5 leading-tight font-bold text-foreground line-clamp-2">
              {displayTitle}
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed relative z-10 max-w-[260px] my-3 line-clamp-3">
          {displayDesc}
        </p>

        <div className="shrink-0 relative z-10">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-5 font-semibold text-sm group/btn"
            asChild
          >
            <a href={displayLink} onPointerDown={(e) => e.stopPropagation()}>
              {displayBtn}
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Highlights</h2>
      </div>

      {/* Card Stack */}
      <section className="relative w-full max-w-[380px] mx-auto">
        <div
          ref={stackRef}
          className="relative select-none touch-pan-y"
          style={{ height: STACK_HEIGHT }}
          role="region"
          aria-label="Swipeable highlights carousel"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {allCards.map((card, i) => {
            let pos = i - activeIdx;
            if (pos > totalCards / 2) pos -= totalCards;
            if (pos < -totalCards / 2) pos += totalCards;
            const absPos = Math.abs(pos);
            if (absPos > 2) return null; // don't render cards too far away

            return (
              <div
                key={`${card.id}-${i}`}
                className="w-full h-full"
                style={getCardStyle(i)}
              >
                {renderCardContent(card, i, pos === 0)}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            className="highlights-nav-btn"
            aria-label="Previous card"
            onClick={goPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-2">
            {/* Dot indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Slide indicators">
              {allCards.map((_, i) => (
                <button
                  key={i}
                  className={`highlights-dot ${i === activeIdx ? 'is-active' : ''}`}
                  role="tab"
                  aria-label={`Go to card ${i + 1}`}
                  aria-selected={i === activeIdx}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
            {/* Counter */}
            <div className="highlights-counter">
              <span className="is-current">{String(activeIdx + 1).padStart(2, '0')}</span>
              <span className="mx-1">/</span>
              <span>{String(totalCards).padStart(2, '0')}</span>
            </div>
          </div>

          <button
            className="highlights-nav-btn"
            aria-label="Next card"
            onClick={goNext}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>


    </div>
  );
}

export function MobileHomeView() {
  const { events, worshipVideos, flipCardConfig, announcements, sermons, prayerRequests, getVisibleGalleryAlbums, systemSettings, liveStreams, broadcasts } = useAdminData();
  const { session, getSessionMember, getEffectiveGroups, logout } = useAuth();

  const sessionMember = getSessionMember();
  const effectiveGroups = sessionMember ? getEffectiveGroups(sessionMember) : [];
  const userGroups = effectiveGroups.length > 0 ? Array.from(new Set([...effectiveGroups])) : ['all'];
  const galleryAlbums = getVisibleGalleryAlbums('all', userGroups as string[]);
  
  const isAnyLive = liveStreams?.some(v => v.isLive);

  // Fallback verse if API fails
  const [verse, setVerse] = useState({
    text: "The Lord is my shepherd; I shall not want.",
    reference: "Psalm 23:1"
  });

  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/verses/today')
      .then(res => res.json())
      .then(data => {
        if (data && data.text) setVerse(data);
      })
      .catch(console.error);

    fetch('/api/prayers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublicPrayers(data);
      })
      .catch(console.error);
  }, []);

  const [activeIdx, setActiveIdx] = useState(0);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('splashShown');
    }
    return true;
  });

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem('splashShown', 'true');
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('grace_dismissed_notifications');
      if (stored) {
        try {
          setDismissedIds(JSON.parse(stored));
        } catch (e) { }
      }
    }

    // Fetch pending counts for admins
    if (session?.role === 'campus_leader' || session?.role === 'admin' || session?.role === 'super_admin') {
      Promise.all([
        fetch('/api/admin/prayers').then(res => res.ok ? res.json() : []),
        fetch('/api/admin/users').then(res => res.ok ? res.json() : [])
      ]).then(([prayers, users]) => {
        let count = 0;
        if (Array.isArray(prayers)) count += prayers.filter(p => p.status === 'pending').length;
        if (Array.isArray(users)) count += users.filter(u => u.status === 'pending').length;
        setPendingCount(count);
      }).catch(() => { });
    }
  }, [session?.role]);

  const unseenCount = (announcements?.filter(a => !dismissedIds.includes(`ann-${a.id}`))?.length || 0) + pendingCount;
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});

  const fetchedAlbums = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchCovers = async () => {
      let changed = false;
      const newCovers: Record<string, string> = {};

      // Seed immediately from server-stored covers
      for (const album of galleryAlbums.slice(0, 5)) {
        if (album.coverImage && !fetchedAlbums.current.has(album.id)) {
          fetchedAlbums.current.add(album.id);
          newCovers[album.id] = album.coverImage;
          changed = true;
        }
      }

      // Only scrape Google Photos for albums missing a stored cover, then persist it
      for (const album of galleryAlbums.slice(0, 5)) {
        if (!fetchedAlbums.current.has(album.id) && album.url && !album.coverImage) {
          fetchedAlbums.current.add(album.id);
          try {
            const res = await fetch(
              `/api/gallery/photos?url=${encodeURIComponent(album.url)}&albumId=${encodeURIComponent(album.id)}&persistCover=1`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.coverImage || (data.photos && data.photos.length > 0)) {
                newCovers[album.id] = data.coverImage || data.photos[0].src;
                changed = true;
              }
            }
          } catch (err) { }
        }
      }

      if (changed) setAlbumCovers(prev => ({ ...prev, ...newCovers }));
    };

    if (galleryAlbums.length > 0) {
      fetchCovers();
    }
  }, [galleryAlbums]);

  const publishedHighlights = contentToHighlightItems({
    events,
    announcements,
    sermons,
    worshipVideos,
    notes: broadcasts || [],
  });
  const campusId = sessionMember?.campusId || 'main';
  const role = session?.role;
  const flipItems = mergeHighlightItems(flipCardConfig.items || [], publishedHighlights).filter(
    (item) => isManualHighlightVisible(item, campusId, userGroups as string[], role),
  );

  const getDisplayDetails = (item: FlipCardItem) => {
    let displayTitle = item.title || '';
    let displayDesc = item.description || '';
    let displayBtn = item.buttonText || 'Read More';
    let displayLink = item.buttonLink || '#';

    if (item.type === 'event') {
      const event = events.find(e => e.id === item.itemId);
      if (event) {
        displayTitle = event.title;
        displayDesc = event.description || '';
        displayLink = `/events`;
        displayBtn = 'View Event';
      }
    } else if (item.type === 'announcement') {
      const ann = announcements.find(a => a.id === item.itemId);
      if (ann) {
        displayTitle = ann.title;
        displayDesc = ann.content;
        displayLink = `/`;
        displayBtn = 'Read Announcement';
      }
    } else if (item.type === 'sermon') {
      const sermon = sermons.find(s => s.id === item.itemId);
      if (sermon) {
        displayTitle = sermon.title;
        displayDesc = `${sermon.pastor} - ${new Date(sermon.date).toLocaleDateString()}`;
        displayLink = `/sermons/series/${sermon.seriesId}`;
        displayBtn = 'Watch Sermon';
      }
    } else if (item.type === 'worship_video') {
      const video = worshipVideos.find(v => v.id === item.itemId);
      if (video) {
        displayTitle = video.title;
        displayDesc = 'Join us in worship';
        displayLink = `https://youtube.com/watch?v=${video.videoId}`;
        displayBtn = 'Watch Video';
      }
    } else if (item.type === 'note') {
      const note = (broadcasts || []).find((b: any) => b.id === item.itemId);
      if (note) {
        displayTitle = note.title;
        displayDesc = note.description || '';
        displayLink = `/#notes`;
        displayBtn = 'Open Note';
      }
    } else if (item.type === 'prayer') {
      const prayer = prayerRequests.find(p => p.id === item.itemId);
      if (prayer) {
        displayTitle = prayer.title;
        displayDesc = prayer.content;
        displayLink = `/prayer-wall`;
        displayBtn = 'Pray With Us';
      }
    }

    return { displayTitle, displayDesc, displayBtn, displayLink };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const recentWorship = worshipVideos.slice(0, 5);

  return (
    <React.Fragment>
      {/* Splash Screen Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] bg-[#FAF7F2] flex flex-col items-center justify-center w-full h-[100dvh]"
            style={{
              backgroundImage: 'var(--bg-pattern)',
              backgroundRepeat: 'repeat',
              backgroundSize: '240px 240px'
            }}
          >
            <motion.div
              animate={{
                opacity: [1, 0.85, 1],
                scale: [1, 1.06, 1],
                filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex flex-col items-center gap-6"
            >
              <img src="/logo.png" alt="Grace Community Fire" className="w-40 h-40 object-contain drop-shadow-[0_0_25px_rgba(139,35,35,0.6)]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`md:hidden flex flex-col min-h-screen text-[#3A2D27] pb-20 font-sans relative w-full ${showSplash ? 'h-[100dvh] overflow-hidden' : 'overflow-x-hidden'} bg-transparent`}
      >

        {/* 1. Header */}
        <header
          className="sticky top-0 z-50 border-b border-[#a59d94]/60 bg-[#FAF7F2]/80 px-4 shadow-[0_4px_16px_-2px_rgba(58,45,39,0.12),0_1px_0px_rgba(255,255,255,0.6)_inset] backdrop-blur-md pt-[env(safe-area-inset-top)]"
        >
          <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">

            <img src="/logo.png" alt="Grace Community" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">

            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search" className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E5D5C5]/60 flex items-center justify-center text-[#8B2323] shadow-sm">
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/notifications" className="relative w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E5D5C5]/60 flex items-center justify-center text-[#8B2323] shadow-sm">
              <Bell className={`w-5 h-5 ${unseenCount > 0 ? 'animate-jiggle origin-top' : ''}`} />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-600 rounded-full border border-white flex items-center justify-center px-1 text-[9px] font-bold text-white leading-none">
                  {unseenCount > 99 ? '99+' : unseenCount}
                </span>
              )}
            </Link>
            {session ? (
              <ProfileSwitcher variant="pill" />
            ) : (
              <Link href="/login" className="w-10 h-10 rounded-full bg-[#721515] flex items-center justify-center text-white border border-[#E5D5C5]/60 shadow-sm">
                <span className="text-xs font-bold">DA</span>
              </Link>
            )}
          </div>
          </div>
        </header>

        <div className="px-4 pt-3 space-y-8">

          {/* 2. Hero Card */}
          <div className="rounded-[2.5rem] bg-[#5C1111] text-white overflow-hidden shadow-xl relative">
            {/* Background Logo */}
            <img src="/logo3.png" alt="" className="absolute top-0 right-0 w-56 h-56 object-contain opacity-60 pointer-events-none mix-blend-overlay" />

            <div className="relative z-10 p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">Welcome to</p>
                <h2 className="text-5xl font-serif font-bold leading-tight tracking-tight">
                  Grace <br />Community
                </h2>
                <p className="text-white/70 text-sm pt-2 leading-relaxed">
                  Where faith grows, hearts connect,<br />and lives are transformed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button asChild className="flex-1 bg-[#8B2323] hover:bg-[#721515] active:scale-95 active:bg-[#5a1010] transition-all text-white rounded-full py-6 font-semibold shadow-md px-1">
                  <Link href="/visit">
                    <span className="text-sm tracking-tight">Join Sunday</span>
                  </Link>
                </Button>
                {isAnyLive ? (
                  <Button asChild variant="default" className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-bold rounded-full py-6 shadow-[0_4px_16px_rgba(239,68,68,0.4)] relative overflow-hidden group border-0 px-1">
                    <Link href="/live">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-white/20 to-red-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      <span className="text-sm tracking-tight font-bold z-10 relative">LIVE NOW</span>
                      <div className="relative flex items-center justify-center w-3 h-3 shrink-0 z-10">
                        <span className="absolute w-3 h-3 bg-red-300 rounded-full animate-ping" />
                        <span className="relative w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      </div>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="flex-1 bg-[#8B2323] hover:bg-[#721515] active:scale-95 active:bg-[#5a1010] transition-all text-white rounded-full py-6 font-semibold shadow-md px-1">
                    <Link href="/live">
                      <span className="text-sm tracking-tight">Watch Live</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-3 border-t border-white/10 bg-black/20">
              <div className="p-5 text-center border-r border-white/10">
                <div className="text-2xl font-bold font-sans"><AnimatedNumber end={systemSettings?.statsMembers || 2500} delay={2600} /></div>
                <div className="text-[9px] text-white/60 uppercase tracking-widest font-semibold mt-1">Members</div>
              </div>
              <div className="p-5 text-center border-r border-white/10">
                <div className="text-2xl font-bold font-sans"><AnimatedNumber end={systemSettings?.statsGroups || 25} delay={2600} suffix="+" /></div>
                <div className="text-[9px] text-white/60 uppercase tracking-widest font-semibold mt-1">Groups</div>
              </div>
              <div className="p-5 text-center">
                <div className="text-2xl font-bold font-sans"><AnimatedNumber end={systemSettings?.statsYears || 15} delay={2600} /></div>
                <div className="text-[9px] text-white/60 uppercase tracking-widest font-semibold mt-1">Yrs Serving</div>
              </div>
            </div>
          </div>

          {/* 3. Quick Actions */}
          <div className="grid grid-cols-4 gap-2 px-1">
            <button onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  await Geolocation.requestPermissions();
                } catch (e) {
                  console.warn("Native location permission request failed", e);
                }
              }
              if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
              const btn = document.getElementById('checkin-icon');
              if (btn) btn.classList.add('animate-pulse');
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  try {
                    const sessRes = await fetch('/api/attendance/active');
                    if (!sessRes.ok) { if (btn) btn.classList.remove('animate-pulse'); alert('No active sessions right now.'); return; }
                    const sessions = await sessRes.json();
                    if (!Array.isArray(sessions) || sessions.length === 0) { if (btn) btn.classList.remove('animate-pulse'); alert('No active sessions right now.'); return; }
                    const session = sessions[0];
                    const res = await fetch('/api/attendance/check-in', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: session._id, type: session.type || 'session', latitude: position.coords.latitude, longitude: position.coords.longitude })
                    });
                    const data = await res.json();
                    if (btn) btn.classList.remove('animate-pulse');
                    if (res.ok) {
                      alert('✅ Checked in successfully!');
                    } else {
                      alert(data.message || data.error || 'Check-in failed');
                    }
                  } catch { if (btn) btn.classList.remove('animate-pulse'); alert('Connection error. Try again.'); }
                },
                () => { if (btn) btn.classList.remove('animate-pulse'); alert('Location access denied. Please enable GPS.'); },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
              );
            }} className="flex flex-col items-center gap-2 group">
              <div id="checkin-icon" className="w-14 h-14 rounded-2xl bg-[#F3EAE1] flex items-center justify-center text-[#8B2323] border border-[#E5D5C5] shadow-sm">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#7A6150]">Check-In</span>
            </button>
            <Link href="/prayer-wall" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-[#F3EAE1] flex items-center justify-center text-[#8B2323] border border-[#E5D5C5] shadow-sm">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#7A6150]">Prayer</span>
            </Link>
            <Link href="/music" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-[#F3EAE1] flex items-center justify-center text-[#8B2323] border border-[#E5D5C5] shadow-sm">
                <Music className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#7A6150]">Worship</span>
            </Link>

            <Link href="/announcements" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-[#F3EAE1] flex items-center justify-center text-[#8B2323] border border-[#E5D5C5] shadow-sm">
                <Megaphone className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#7A6150] whitespace-nowrap">Announcements</span>
            </Link>
          </div>

          {/* 4. Highlight Morphing Card Stack */}
          {(() => {
            // Build the card data array
            const allCards: { type: string; id: string; data: any; tag: string }[] = [
              { type: 'verse', id: 'verse-card', data: verse, tag: 'Daily Verse' }
            ];

            // Guests: only Daily Verse + Welcome to Grace
            // Logged-in: Daily Verse + all admin-uploaded highlight cards
            if (session && flipCardConfig.isActive) {
              flipItems.forEach((item, idx) => {
                const tagMap: Record<string, string> = {
                  event: 'Event', announcement: 'News', sermon: 'Sermon',
                  worship_video: 'Worship', prayer: 'Prayer', note: 'Note', custom: 'Featured'
                };
                allCards.push({
                  type: 'admin',
                  id: item.id || `admin-${idx}`,
                  data: item,
                  tag: tagMap[item.type] || 'Highlight'
                });
              });
            } else if (!session) {
              allCards.push({
                type: 'admin',
                id: GUEST_HIGHLIGHT_CARD.id,
                data: GUEST_HIGHLIGHT_CARD,
                tag: 'Featured'
              });
            }

            const totalCards = allCards.length;

            // Empty state
            if (totalCards === 0) {
              return (
                <div className="py-10 text-center">
                  <div className="highlights-icon-tile mx-auto mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">No highlights at the moment.</p>
                </div>
              );
            }

            return (
              <HighlightsCardStack
                allCards={allCards}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
                verse={verse}
                christianIcons={christianIcons}
                getDisplayDetails={getDisplayDetails}
              />
            );
          })()}

          {session ? (
            <>

              {/* Note Share */}
              <div className="-mx-4 mt-8">
                <div className="px-4">
                  <NoteShareSection />
                </div>
              </div>

              {/* Community Prayers Section */}
              <div className="mt-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Community Prayers</h2>
                </div>
                
                {/* Prayer Wall CTA */}
                <div className="rounded-3xl bg-gradient-to-r from-[#8B2323] to-[#5C1111] p-5 text-white relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 rounded-full blur-xl" />

                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 shrink-0 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                        <Heart className="w-6 h-6 text-white fill-white/20" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif font-bold mb-0.5">Prayer Wall</h3>
                        <p className="text-white/80 text-xs leading-snug">
                          Let us know how we can pray and support you this week.
                        </p>
                      </div>
                    </div>

                    <Link href="/prayer-wall" className="w-full">
                      <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 bg-white/5 rounded-xl h-11 font-semibold border-2 text-sm">
                        Submit Prayer Request
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Recent Prayers */}
                {publicPrayers && publicPrayers.length > 0 && (
                  <>
                    <div className="flex flex-col gap-4">
                      {publicPrayers
                        .filter(p => p.status === 'approved' || p.status === undefined)
                        .slice(0, 3)
                        .map(prayer => (
                          <div key={prayer.id} className="w-full">
                            <PrayerCard prayer={prayer} session={session} />
                          </div>
                        ))
                      }
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Link href="/prayer-wall" className="text-[#8B2323] text-sm font-bold flex items-center hover:underline">
                        See all <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Announcements */}
              <div className="mt-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Church Announcements</h2>
                </div>
                <div className="-mx-4">
                  <AnnouncementsSection preview={true} />
                </div>
              </div>

              {/* Events */}
              {upcomingEvents && upcomingEvents.length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Upcoming Events</h2>
                  <Link href="/events" className="text-[#8B2323] text-sm font-bold flex items-center">
                    See all <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                  {upcomingEvents.map(event => {
                    const eventDate = new Date(event.date);
                    return (
                      <Link href={`/events`} key={event.id} className="min-w-[260px] max-w-[280px] bg-white rounded-3xl p-4 flex gap-4 shadow-sm snap-start border border-border/50">
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-[#FFF5F5] flex flex-col items-center justify-center border border-red-50">
                            <span className="text-xl font-bold text-[#8B2323] leading-none">{eventDate.getDate()}</span>
                            <span className="text-xs font-bold text-[#8B2323] mt-1">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          <h4 className="font-bold text-[#1A202C] leading-tight mb-2 line-clamp-1">{event.title}</h4>
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-[#7A6150] font-medium">
                              <Clock className="w-3 h-3 mr-1.5" />
                              {event.time}
                            </div>
                            <div className="flex items-center text-xs text-[#7A6150] font-medium min-w-0">
                              <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                              {(() => {
                                const mapsHref = getMapsUrl({
                                  mapUrl: event.mapUrl,
                                  location: event.location || 'Grace Community',
                                  latitude: event.attendanceConfig?.latitude,
                                  longitude: event.attendanceConfig?.longitude,
                                });
                                const label = event.location || 'Grace Community';
                                return mapsHref ? (
                                  <div
                                    className="inline-flex min-w-0 flex-1 -space-x-px rounded-lg shadow-sm shadow-black/5"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <Button
                                      asChild
                                      variant="outline"
                                      className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 px-2 text-[11px] font-medium text-[#1A202C] border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1]"
                                    >
                                      <a
                                        href={mapsHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          window.open(mapsHref, '_blank');
                                        }}
                                      >
                                        <span className="truncate">{label}</span>
                                      </a>
                                    </Button>
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="icon"
                                      className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 w-7 shrink-0 border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1] p-0 [&_img]:!size-4"
                                      aria-label="Open directions in Maps"
                                    >
                                      <a
                                        href={mapsHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          window.open(mapsHref, '_blank');
                                        }}
                                      >
                                        <MapsPinIcon className="w-[16px] h-[16px]" />
                                      </a>
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="line-clamp-1">{label}</span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              )}

              {/* 5. Latest Sermons */}
              {sermons && sermons.length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Latest Sermons</h2>
                    <Link href="/sermons" className="text-[#8B2323] text-sm font-bold flex items-center">
                      See all <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                    {sermons.slice(0, 5).map(sermon => (
                      <Link href={`/sermons/series/${sermon.seriesId}`} key={sermon.id} className="min-w-[280px] w-[280px] h-[160px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                        <img src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`} alt={sermon.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-600/90 backdrop-blur-sm text-white flex items-center justify-center pl-1 shadow-lg">
                            <Play className="w-5 h-5 fill-current" />
                          </div>
                          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full self-start mb-2">
                            {sermon.pastor}
                          </span>
                          <h4 className="text-white font-bold leading-tight line-clamp-1 text-sm">{sermon.title}</h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}



              {/* 6. Worship Focus */}
              {recentWorship && recentWorship.length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Worship Focus</h2>
                  <Link href="/music" className="text-[#8B2323] text-sm font-bold flex items-center">
                    See all <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                  {recentWorship.map(video => (
                    <a href={`https://youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" key={video.id} className="min-w-[280px] w-[280px] h-[160px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                      <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center pl-1 shadow-lg">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                        <h4 className="text-white font-bold leading-tight line-clamp-1 text-sm">{video.title}</h4>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              )}



              {/* Photo Gallery */}
              {galleryAlbums.length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Photo Gallery</h2>
                    <Link href="/gallery" className="text-[#8B2323] text-sm font-bold flex items-center">
                      See all <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                    {galleryAlbums.slice(0, 5).map(album => {
                      const cover = album.coverImage || albumCovers[album.id];
                      return (
                      <Link href="/gallery" key={album.id} className="min-w-[220px] w-[220px] h-[220px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                        {cover ? (
                          <img src={cover} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#E5D5C5] flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-[#7A6150]/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full self-start mb-2">
                            {album.category}
                          </span>
                          <h4 className="text-white font-bold leading-tight line-clamp-2 text-sm">{album.title}</h4>
                        </div>
                      </Link>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* 8. Live Stream Widget */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Live Worship</h2>
                </div>
                <div className="-mx-4">
                  <LiveStreamSection variant="widget" />
                </div>
              </div>






              <div className="mt-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Your Campus Location</h2>
                </div>
                <div className="-mx-4">
                  <CampusDetails />
                </div>
              </div>

            </>
          ) : (
            <>

              {/* 5. Latest Sermons */}
              {sermons && sermons.length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Latest Sermons</h2>
                    <Link href="/sermons" className="text-[#8B2323] text-sm font-bold flex items-center">
                      See all <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                    {sermons.slice(0, 5).map(sermon => (
                      <Link href={`/sermons/series/${sermon.seriesId}`} key={sermon.id} className="min-w-[280px] w-[280px] h-[160px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                        <img src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`} alt={sermon.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-600/90 backdrop-blur-sm text-white flex items-center justify-center pl-1 shadow-lg">
                            <Play className="w-5 h-5 fill-current" />
                          </div>
                          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full self-start mb-2">
                            {sermon.pastor}
                          </span>
                          <h4 className="text-white font-bold leading-tight line-clamp-1 text-sm">{sermon.title}</h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}



              {/* 6. Worship Focus */}
              {recentWorship && recentWorship.length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Worship Focus</h2>
                  <Link href="/music" className="text-[#8B2323] text-sm font-bold flex items-center">
                    See all <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                  {recentWorship.map(video => (
                    <a href={`https://youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" key={video.id} className="min-w-[280px] w-[280px] h-[160px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                      <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center pl-1 shadow-lg">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                        <h4 className="text-white font-bold leading-tight line-clamp-1 text-sm">{video.title}</h4>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              )}



              {/* 8. Live Stream Widget */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Live Worship</h2>
                </div>
                <div className="-mx-4">
                  <LiveStreamSection variant="widget" />
                </div>
              </div>





              {/* Restricted Community Features */}
              <div className="mt-8">
                <AuthGate
                  title="Community Features"
                  description="Features like Announcements, Events, Prayer Wall, and Photo Gallery are exclusive to Grace Community members. Please sign in or register to access this content."
                >
                  <div className="flex flex-col space-y-8">
                    {/* 2. Announcements */}
                    <div className="mt-8">
                      <div className="mb-4">
                        <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Church Announcements</h2>
                      </div>
                      <div className="-mx-4">
                        <AnnouncementsSection preview={true} />
                      </div>
                    </div>


                    {/* 3. Upcoming Events */}
                    {upcomingEvents && upcomingEvents.length > 0 && (
                      <div>

                        <div className="flex justify-between items-end mb-4">
                          <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Upcoming Events</h2>
                        <Link href="/events" className="text-[#8B2323] text-sm font-bold flex items-center">
                          See all <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>

                      <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                        {upcomingEvents.map(event => {
                          const eventDate = new Date(event.date);
                          return (
                            <Link href={`/events`} key={event.id} className="min-w-[260px] max-w-[280px] bg-white rounded-3xl p-4 flex gap-4 shadow-sm snap-start border border-border/50">
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="w-16 h-16 rounded-2xl bg-[#FFF5F5] flex flex-col items-center justify-center border border-red-50">
                                  <span className="text-xl font-bold text-[#8B2323] leading-none">{eventDate.getDate()}</span>
                                  <span className="text-xs font-bold text-[#8B2323] mt-1">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                              </div>
                              <div className="flex flex-col justify-center">
                                <h4 className="font-bold text-[#1A202C] leading-tight mb-2 line-clamp-1">{event.title}</h4>
                                <div className="space-y-1">
                                  <div className="flex items-center text-xs text-[#7A6150] font-medium">
                                    <Clock className="w-3 h-3 mr-1.5" />
                                    {event.time}
                                  </div>
                                  <div className="flex items-center text-xs text-[#7A6150] font-medium min-w-0">
                                    <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                                    {(() => {
                                      const mapsHref = getMapsUrl({
                                        mapUrl: event.mapUrl,
                                        location: event.location || 'Grace Community',
                                        latitude: event.attendanceConfig?.latitude,
                                        longitude: event.attendanceConfig?.longitude,
                                      });
                                      const label = event.location || 'Grace Community';
                                      return mapsHref ? (
                                        <div
                                          className="inline-flex min-w-0 flex-1 -space-x-px rounded-lg shadow-sm shadow-black/5"
                                          onClick={(e) => e.preventDefault()}
                                        >
                                          <Button
                                            asChild
                                            variant="outline"
                                            className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 px-2 text-[11px] font-medium text-[#1A202C] border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1]"
                                          >
                                            <a
                                              href={mapsHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(mapsHref, '_blank');
                                              }}
                                            >
                                              <span className="truncate">{label}</span>
                                            </a>
                                          </Button>
                                          <Button
                                            asChild
                                            variant="outline"
                                            size="icon"
                                            className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 w-7 shrink-0 border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1] p-0 [&_img]:!size-4"
                                            aria-label="Open directions in Maps"
                                          >
                                            <a
                                              href={mapsHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(mapsHref, '_blank');
                                              }}
                                            >
                                              <MapsPinIcon className="w-[16px] h-[16px]" />
                                            </a>
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="line-clamp-1">{label}</span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>

                    </div>
                    )}


                    {/* Community Prayers Section */}
                    <div className="mt-8">
                      <div className="mb-4">
                        <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Community Prayers</h2>
                      </div>

                      {/* Prayer Wall CTA */}
                      <div className="rounded-3xl bg-gradient-to-r from-[#8B2323] to-[#5C1111] p-5 text-white relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 rounded-full blur-xl" />

                        <div className="relative z-10 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 shrink-0 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                              <Heart className="w-6 h-6 text-white fill-white/20" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-serif font-bold mb-0.5">Prayer Wall</h3>
                              <p className="text-white/80 text-xs leading-snug">
                                Let us know how we can pray and support you this week.
                              </p>
                            </div>
                          </div>

                          <Link href="/prayer-wall" className="w-full">
                            <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 bg-white/5 rounded-xl h-11 font-semibold border-2 text-sm">
                              Submit Prayer Request <ArrowRightIcon className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Recent Prayers */}
                      {publicPrayers && publicPrayers.length > 0 && (
                        <>
                          <div className="flex flex-col gap-4">
                            {publicPrayers
                              .filter(p => p.status === 'approved' || p.status === undefined)
                              .slice(0, 3)
                              .map(prayer => (
                                <div key={prayer.id} className="w-full">
                                  <PrayerCard prayer={prayer} session={session} />
                                </div>
                              ))
                            }
                          </div>
                          <div className="mt-4 flex justify-center">
                            <Link href="/prayer-wall" className="text-[#8B2323] text-sm font-bold flex items-center hover:underline">
                              See all <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </div>
                        </>
                      )}
                    </div>


                    {/* 7. Photo Gallery */}
                    {galleryAlbums.length > 0 && (
                      <div className="mt-8">

                        <div className="flex justify-between items-end mb-4">
                          <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Photo Gallery</h2>
                          <Link href="/gallery" className="text-[#8B2323] text-sm font-bold flex items-center">
                            See all <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 -mr-4 pr-4 snap-x no-scrollbar">
                          {galleryAlbums.slice(0, 5).map(album => {
                            const cover = album.coverImage || albumCovers[album.id];
                            return (
                            <Link href="/gallery" key={album.id} className="min-w-[220px] w-[220px] h-[220px] rounded-3xl overflow-hidden relative shadow-sm snap-start group block">
                              {cover ? (
                                <img src={cover} alt={album.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#E5D5C5] flex items-center justify-center">
                                  <ImageIcon className="w-10 h-10 text-[#7A6150]/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full self-start mb-2">
                                  {album.category}
                                </span>
                                <h4 className="text-white font-bold leading-tight line-clamp-2 text-sm">{album.title}</h4>
                              </div>
                            </Link>
                            );
                          })}
                        </div>

                      </div>
                    )}


                    <div className="mt-8">
                      <div className="mb-4">
                        <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">Your Campus Location</h2>
                      </div>
                      <div className="-mx-4">
                        <CampusDetails />
                      </div>
                    </div>


                  </div>
                </AuthGate>
              </div>


            </>
          )}</div>
      </div>
    </React.Fragment>
  );
}

function PrayerCard({ prayer, session }: { prayer: any, session: any }) {
  const [prayedCount, setPrayedCount] = useState(prayer.prayedCount || 0);
  const [hasPrayed, setHasPrayed] = useState(
    prayer.prayedBy && session && prayer.prayedBy.includes(session.memberId)
  );

  const handlePray = async () => {
    if (hasPrayed) return;

    // Optimistic UI update
    setHasPrayed(true);
    setPrayedCount(prev => prev + 1);

    try {
      const res = await fetch(`/api/prayers/${prayer.id}/pray`, { method: 'POST' });

      if (!res.ok) {
        // Revert on failure
        setHasPrayed(false);
        setPrayedCount(prev => prev - 1);
        return;
      }

      const data = await res.json();
      if (data.alreadyPrayed) {
        // It was already prayed, so revert the optimistic count but keep hasPrayed true
        setPrayedCount(data.prayedCount);
      }
    } catch (err) {
      setHasPrayed(false);
      setPrayedCount(prev => prev - 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#F3EAE1]">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-[#1A202C] leading-tight">{prayer.title}</h4>
        <span className="text-[10px] text-[#7A6150] font-medium bg-[#F1E8DC] px-2 py-1 rounded-full whitespace-nowrap ml-2">
          {new Date(prayer.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <p className="text-[#7A6150] text-sm line-clamp-2 mb-3">{prayer.content}</p>

      <div className="flex items-center justify-between border-t border-[#F3EAE1] pt-3 mt-1">
        <div className="flex items-center text-xs font-semibold text-[#8B2323]">
          <User className="w-3.5 h-3.5 mr-1.5" />
          {prayer.authorName || 'Anonymous'}
        </div>

        <button
          onClick={handlePray}
          disabled={hasPrayed}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${hasPrayed
            ? 'bg-[#FBE8E8] text-[#8B2323]'
            : 'bg-[#F3EAE1] text-[#7A6150] hover:bg-[#E5D5C5]'
            }`}
        >
          <Heart className={`w-3.5 h-3.5 ${hasPrayed ? 'fill-current' : ''}`} />
          {hasPrayed ? 'Prayed' : 'I Prayed'} • {prayedCount}
        </button>
      </div>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
