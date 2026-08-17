"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Calendar, Clock, Heart, MapPin, Sparkles, Users, ArrowRight, Bell, Radio } from 'lucide-react';
import { useAdminData, type FlipCardItem } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { GUEST_HIGHLIGHT_CARD } from '@/lib/hooks/use-system';
import { contentToHighlightItems, mergeHighlightItems, isManualHighlightVisible } from '@/lib/highlight-utils';
import Link from 'next/link';

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
  "from-primary/15 via-background to-accent/15",
  "from-prayer/15 via-background to-success/15",
  "from-accent/15 via-background to-primary/15",
  "from-success/15 via-background to-prayer/15",
  "from-destructive/15 via-background to-accent/15",
];

export const HeroSection = () => {
  const { flipCardConfig, events, announcements, sermons, worshipVideos, prayerRequests, liveStreams, broadcasts } = useAdminData();
  const { session, getSessionMember, getEffectiveGroups } = useAuth();
  const sessionMember = getSessionMember();
  const effectiveGroups = sessionMember ? getEffectiveGroups(sessionMember) : [];
  const userGroups = effectiveGroups.length > 0 ? Array.from(new Set([...effectiveGroups])) : ['all'];
  const isAnyLive = liveStreams?.some((stream: any) => stream.isLive);

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

  const [verse, setVerse] = useState({
    text: "The Lord is my shepherd; I shall not want.",
    reference: "Psalm 23:1"
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    fetch('/api/verses/today')
      .then(res => res.json())
      .then(data => {
        if (data && data.text) setVerse(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Guests always get the Welcome card; logged-in users use admin flip config
    if (!session || flipCardConfig.isActive) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [flipCardConfig.isActive, session]);

  // Auto-rotate fanned card stack (logged-in admin cards only)
  const publishedHighlights = contentToHighlightItems({
    events,
    announcements,
    sermons,
    worshipVideos,
    notes: broadcasts || [],
  });
  const campusId = sessionMember?.campusId || 'main';
  const flipItems = session && flipCardConfig.isActive
    ? mergeHighlightItems(flipCardConfig.items || [], publishedHighlights).filter((item) =>
        isManualHighlightVisible(item, campusId, userGroups as string[], session.role),
      )
    : [GUEST_HIGHLIGHT_CARD];
  useEffect(() => {
    if (flipItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % flipItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [flipItems.length]);

  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      {/* Advanced Background */}
      <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-mesh)' }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="w-full flex justify-center lg:justify-start">
            {/* White Card Container */}
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-12 shadow-xl border border-white/20 animate-slide-up flex flex-col items-center text-center space-y-8 w-full max-w-2xl">
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] font-heading text-primary">
                Welcome to <br className="block" />
                Grace Community
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A place where faith grows, hearts connect, and lives are transformed. 
                Join our vibrant community in worship, fellowship, and service.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto pt-2">
                <Button variant="gradient" size="xl" className="hover-lift shadow-xl w-full sm:w-auto rounded-2xl text-lg font-semibold py-7">
                  Join Us Sunday
                </Button>
                <Link href="/live" className="w-full sm:w-auto block">
                  {isAnyLive ? (
                    <Button variant="default" size="xl" className="hover-lift w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-7 shadow-xl shadow-red-600/20 relative group overflow-hidden border border-red-500 rounded-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-white/20 to-red-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      <span className="absolute left-3 top-3 w-3 h-3 bg-red-300 rounded-full animate-ping" />
                      <span className="absolute left-3 top-3 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      <Radio className="w-5 h-5 mr-2 animate-pulse" />
                      LIVE NOW
                    </Button>
                  ) : (
                    <Button variant="ghost" size="xl" className="hover-lift w-full sm:w-auto text-primary font-bold text-lg py-7 rounded-2xl">
                      Watch Live
                    </Button>
                  )}
                </Link>
              </div>

            </div>
          </div>

          {/* Featured Event Card */}
        <div className="lg:justify-self-end animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="group perspective-1000 floating">
            <div className={`relative w-full max-w-md mx-auto transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT: Daily Bible Verse */}
              <Card className="glass-card p-8 backface-hidden shadow-2xl border-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                      Daily Bible Verse
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold italic text-primary">
                      "{verse.text}"
                    </h3>
                    <p className="text-muted-foreground text-right">— {verse.reference}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>Take a moment to reflect</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Heart className="w-4 h-4 text-primary" />
                      <span>Keep this verse close today</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Share God’s Word</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button variant="gradient" className="w-full hover-lift">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Read More
                    </Button>
                  </div>
                </div>
              </Card>

              {/* BACK: Guest Welcome card, or admin custom flip content for logged-in users */}
              {flipItems.length > 0 && (() => {
                // Build visible stack (up to 3 cards)
                const stackRotations = ['rotate-0', '-rotate-6', 'rotate-6'];
                const stackScales = ['scale-100', 'scale-95', 'scale-90'];
                const stackTranslateY = ['translate-y-0', 'translate-y-2', 'translate-y-4'];
                const stackZIndex = ['z-30', 'z-20', 'z-10'];
                const stackOpacity = ['opacity-100', 'opacity-80', 'opacity-60'];
                const borderColors = [
                  'border-primary/30',
                  'border-prayer/30',
                  'border-accent/30',
                  'border-success/30',
                  'border-destructive/30',
                ];

                const stack: { item: FlipCardItem; originalIndex: number; stackPos: number }[] = [];
                for (let i = 0; i < Math.min(flipItems.length, 3); i++) {
                  const idx = (activeIdx + i) % flipItems.length;
                  stack.push({ item: flipItems[idx], originalIndex: idx, stackPos: i });
                }
                const orderedStack = stack.reverse();

                return (
                  <div
                    className="absolute inset-0 backface-hidden rotate-y-180 cursor-pointer"
                    onClick={() => setActiveIdx(prev => (prev + 1) % flipItems.length)}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {orderedStack.map(({ item, originalIndex, stackPos }) => {
                        const { displayTitle, displayDesc, displayBtn, displayLink } = getDisplayDetails(item);
                        return (
                          <div
                            key={item.id || originalIndex}
                            className={`absolute inset-0 transition-all duration-500 ease-out ${stackRotations[stackPos]} ${stackScales[stackPos]} ${stackTranslateY[stackPos]} ${stackZIndex[stackPos]} ${stackOpacity[stackPos]}`}
                          >
                            <Card className={`p-8 w-full h-full shadow-2xl border-2 ${borderColors[originalIndex % borderColors.length]} flex flex-col justify-center items-center text-center bg-gradient-to-br ${cardGradients[originalIndex % cardGradients.length]} backdrop-blur-md rounded-2xl`}>
                              <div className="space-y-5 w-full">
                                <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                                  {christianIcons[originalIndex % christianIcons.length]}
                                </div>

                                <h3 className="text-2xl sm:text-3xl font-bold text-foreground line-clamp-2">
                                  {displayTitle}
                                </h3>

                                <p className="text-muted-foreground text-base px-2 line-clamp-3">
                                  {displayDesc}
                                </p>

                                <div className="pt-4">
                                  <Button variant="gradient" size="lg" className="w-full hover-lift shadow-lg group/btn" asChild>
                                    <Link href={displayLink} onClick={(e) => e.stopPropagation()}>
                                      {displayBtn}
                                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>

        </div>
      </div>
    </section>
  );
};