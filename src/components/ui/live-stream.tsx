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

  // Smart campus selection: prioritize user's live campus, then any live campus
  const bestCampus = React.useMemo(() => {
    const liveCampuses = liveStreams.filter((ls: any) => ls.isLive);
    
    if (liveCampuses.length === 0) {
      // No campus is live — default to user's campus
      return currentUser?.campusId || campuses[0]?.id || 'main';
    }
    
    // If user's campus is live, pick that
    const userLive = liveCampuses.find((ls: any) => ls.campusId === currentUser?.campusId);
    if (userLive) return userLive.campusId;
    
    // Otherwise pick the last one in the list (most recently added/configured)
    return liveCampuses[liveCampuses.length - 1].campusId;
  }, [liveStreams, currentUser?.campusId, campuses]);

  const [selectedCampus, setSelectedCampus] = useState(bestCampus);
  
  // Keep selectedCampus in sync when bestCampus changes (e.g. a campus goes live)
  React.useEffect(() => {
    setSelectedCampus(bestCampus);
  }, [bestCampus]);
  
  const activeStream = liveStreams.find((ls: any) => ls.campusId === selectedCampus);
  const isLive = activeStream?.isLive || false;
  const youtubeVideoId = activeStream?.videoId || '';
  const youtubeEmbedUrl = youtubeVideoId ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1` : '';

  return (
    <section id="live-stream" className="py-10 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-5 mb-10">
            <span className="section-heading">Watch Live</span>
            <h2 className="section-title">Live Worship</h2>
            <p className="section-subtitle">
              Join us online for live worship and fellowship
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="bg-card border shadow-sm p-2 rounded-xl inline-flex items-center gap-3">
              <span className="text-sm font-medium px-2 text-muted-foreground">Select Campus:</span>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="w-[200px] border-0 bg-muted/50 focus:ring-0 rounded-lg">
                  <SelectValue placeholder="Select Campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-red-600 text-white gap-2 shadow-lg">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </Badge>
                    </div>
                  )}
                  

                </div>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{activeStream?.title || 'Sunday Worship Service'}</h3>
                      <p className="text-muted-foreground">
                        {activeStream?.description || 'Join us online for worship and a powerful message from the word of God.'}
                      </p>
                    </div>
                    

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
  const [isLive, setIsLive] = useState(false); // Toggle this to true to show the video player

  return (
    <div className="py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex h-4 w-4">
          {isLive ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gray-400"></span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1A202C]">
          {isLive ? "Live Now" : "Upcoming Stream"}
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-black rounded-3xl relative">
            {isLive ? (
              <div className="aspect-video w-full bg-black relative">
                {/* Embedded Player (YouTube / Vimeo) */}
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/live_stream?channel=UCUZHFZ9jIKrLroW8LcyJEQQ" 
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

          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white">
            <h2 className="text-xl font-bold text-[#1A202C] mb-2">Sunday Worship Experience</h2>
            <p className="text-[#7A6150] mb-4">Join us as we worship together and hear a powerful message from Pastor John.</p>
            
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#8B2323]">
              <div className="flex items-center gap-2 bg-[#FBE8E8] px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4" /> Sundays
              </div>
              <div className="flex items-center gap-2 bg-[#FBE8E8] px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4" /> 9:00 AM & 11:30 AM
              </div>
            </div>
          </div>
        </div>

        {/* Chat / Interaction Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full min-h-[400px] flex flex-col border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-sm rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-[#F3EAE1] bg-white/40 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#8B2323]" />
              <h3 className="font-bold text-[#1A202C]">Live Chat</h3>
            </div>
            
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#F3EAE1] rounded-full flex items-center justify-center mb-2">
                <Heart className="w-8 h-8 text-[#8B2323]" />
              </div>
              <h4 className="font-bold text-[#3A2D27]">Chat is offline</h4>
              <p className="text-sm text-[#7A6150]">The live chat will be available 15 minutes before the service begins. We can't wait to connect with you!</p>
            </div>
            
            <div className="p-4 bg-[#FAF7F2] border-t border-[#F3EAE1]">
              <div className="w-full bg-white border border-[#E5D5C5] rounded-full px-4 py-3 text-sm text-[#a59d94] cursor-not-allowed flex items-center">
                Chat disabled...
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}