"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminData } from '@/lib/admin-data-context';
import { Play, Radio, Users, Heart, ExternalLink, PlayCircle, Clock, Calendar, MessageSquare } from 'lucide-react';
import { motion } from "framer-motion";

export const LiveStreamSection = ({ variant = 'widget' }: { variant?: 'page' | 'widget' }) => {
  if (variant === 'page') {
    return <LiveStreamPageLayout />;
  }
  return <LiveStreamWidgetLayout />;
};

function LiveStreamWidgetLayout() {
  const { liveStreams, campuses, currentUser } = useAdminData();

  const [localLiveStreams, setLocalLiveStreams] = useState<any[]>(liveStreams);
  const [selectedCampus, setSelectedCampus] = useState(currentUser?.campusId || campuses[0]?.id || 'main');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smart campus selection: prioritize user's live campus, then any live campus
  // Compute this based on localLiveStreams (which gets refreshed on mount)
  const bestCampus = React.useMemo(() => {
    const liveCampuses = localLiveStreams.filter((ls: any) => ls.isLive);
    
    if (liveCampuses.length === 0) {
      // No campus is live — default to user's campus
      return currentUser?.campusId || campuses[0]?.id || 'main';
    }
    
    // Sort live campuses by most recently updated so the freshest stream takes priority
    const sortedLive = [...liveCampuses].sort((a: any, b: any) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Pick the most recently updated live stream
    return sortedLive[0].campusId;
  }, [localLiveStreams, currentUser?.campusId, campuses]);

  // Keep selectedCampus in sync when bestCampus changes (e.g. fresh data arrives)
  React.useEffect(() => {
    setSelectedCampus(bestCampus);
  }, [bestCampus]);

  // Fetch fresh data immediately when component mounts
  React.useEffect(() => {
    let isMounted = true;
    const fetchInitialFreshData = async () => {
      try {
        const res = await fetch('/api/admin/media/livestreams', { cache: 'no-store' });
        if (res.ok && isMounted) {
          const freshData = await res.json();
          const mappedData = freshData.map((item: any) => ({
            ...item,
            id: item._id || item.id
          }));
          setLocalLiveStreams(mappedData);
        }
      } catch (err) {
        console.error('Failed to fetch initial fresh live streams:', err);
      }
    };
    fetchInitialFreshData();
    return () => { isMounted = false; };
  }, []);

  const handleCampusChange = async (campusId: string) => {
    setSelectedCampus(campusId);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/media/livestreams', { cache: 'no-store' });
      if (res.ok) {
        const freshData = await res.json();
        const mappedData = freshData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        }));
        setLocalLiveStreams(mappedData);
      }
    } catch (err) {
      console.error('Failed to fetch fresh live streams:', err);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const activeStream = localLiveStreams.find((ls: any) => ls.campusId === selectedCampus);
  const isLive = activeStream?.isLive || false;
  const youtubeVideoId = activeStream?.videoId || '';
  const youtubeEmbedUrl = youtubeVideoId ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1&fs=1` : '';

  return (
    <section id="live-stream" className="py-10 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header removed as per request */}

          <div className="flex justify-center mb-8">
            <div className="bg-card border shadow-sm p-2 rounded-xl inline-flex items-center gap-3">
              <span className="text-sm font-medium px-2 text-muted-foreground">Select Campus:</span>
              <Select value={selectedCampus} onValueChange={handleCampusChange}>
                <SelectTrigger className="w-[200px] border-0 bg-muted/50 focus:ring-0 rounded-lg">
                  <SelectValue placeholder="Select Campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isRefreshing && (
                <span className="text-xs text-muted-foreground animate-pulse px-2">Updating...</span>
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* YouTube Live Stream Player */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video">
                  {/* YouTube Embed or Fallback */}
                  {youtubeVideoId && isLive ? (
                    <iframe
                      src={youtubeEmbedUrl}
                      title="Live Worship Service"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center p-8 text-center">
                      <Radio className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Stream Offline</h3>
                      <p className="text-muted-foreground max-w-sm">
                        This campus is not currently broadcasting live. Please check back during service times or explore other campuses.
                      </p>
                    </div>
                  )}
                  
                  {/* Live Indicator Overlay */}
                  {isLive && (
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                      <Badge className="bg-red-600 text-white gap-2 shadow-lg">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </Badge>
                    </div>
                  )}
                  

                </div>
                
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg font-semibold">{activeStream?.title || 'Sunday Worship Service'}</h3>
                      <p className="text-muted-foreground text-sm">
                        {activeStream?.description || 'Join us online for worship and a powerful message from the word of God.'}
                      </p>
                    </div>
                    {isLive && youtubeVideoId && (
                      <Button asChild variant="default" className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700">
                        <a href={`https://www.youtube.com/watch?v=${youtubeVideoId}`} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Watch on YouTube
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStreamPageLayout() {
  const { liveStreams, campuses, currentUser } = useAdminData();
  const [localLiveStreams, setLocalLiveStreams] = useState<any[]>(liveStreams);
  const [selectedCampus, setSelectedCampus] = useState(currentUser?.campusId || campuses[0]?.id || 'main');

  const bestCampus = React.useMemo(() => {
    const liveCampuses = localLiveStreams.filter((ls: any) => ls.isLive);
    if (liveCampuses.length === 0) return currentUser?.campusId || campuses[0]?.id || 'main';
    const sortedLive = [...liveCampuses].sort((a: any, b: any) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
    return sortedLive[0].campusId;
  }, [localLiveStreams, currentUser?.campusId, campuses]);

  React.useEffect(() => {
    setSelectedCampus(bestCampus);
  }, [bestCampus]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchInitialFreshData = async () => {
      try {
        const res = await fetch('/api/admin/media/livestreams', { cache: 'no-store' });
        if (res.ok && isMounted) {
          const freshData = await res.json();
          if (Array.isArray(freshData)) {
            setLocalLiveStreams(freshData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch fresh livestreams', err);
      }
    };
    fetchInitialFreshData();
    return () => { isMounted = false; };
  }, []);

  const activeStream = localLiveStreams.find((ls: any) => ls.campusId === selectedCampus);
  const isLive = activeStream?.isLive || false;
  const youtubeVideoId = activeStream?.videoId;
  const youtubeEmbedUrl = youtubeVideoId 
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1`
    : "";

  return (
    <div className="py-8 md:py-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          <div className="relative flex h-5 w-5">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-5 w-5 bg-gray-400"></span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1A202C]">
            {isLive ? "Live Now" : "Upcoming Stream"}
          </h1>
        </div>

        <div className="flex items-center justify-center w-full sm:w-auto">
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger className="w-[220px] h-12 text-base font-medium shadow-sm bg-white/90 backdrop-blur-sm border-[#E5D5C5] text-[#3A2D27]">
              <SelectValue placeholder="Select Campus" />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="text-base py-3">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-black rounded-3xl relative">
          {isLive ? (
            <div className="aspect-video w-full bg-black relative">
              {/* Embedded Player (YouTube / Vimeo) */}
              <iframe 
                width="100%" 
                height="100%" 
                src={youtubeEmbedUrl}
                title="Grace Community Live Stream" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute inset-0"
              ></iframe>
            </div>
          ) : (
            <div className="aspect-video w-full bg-[#3A2D27] relative flex flex-col items-center justify-center text-center p-6">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
              <PlayCircle className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-2xl font-serif text-white mb-2">Service has ended</h3>
              <p className="text-white/60 mb-6">Join us next Sunday at 9:00 AM</p>
              <Button className="bg-[#8B2323] hover:bg-[#6b1b1b] text-white rounded-full px-8">
                Set Reminder
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}