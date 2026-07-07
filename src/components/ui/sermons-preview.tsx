"use client";

import React from 'react';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Calendar, Clock, ArrowRight, Heart, Eye } from 'lucide-react';

export function SermonsPreview() {
  const { sermons, sermonSeries, getVisibleSermons, currentUser } = useAdminData();

  const sortedSermons = React.useMemo(() => {
    // Pass 'global' or current campus id if we have one (usually guests are 'global' unless a campus is selected)
    const activeCampusId = typeof window !== 'undefined' ? localStorage.getItem('grace_activeCampus') || 'global' : 'global';
    const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);
    return [...visibleSermons].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [sermons, currentUser, getVisibleSermons]);

  // Get featured sermon or fallback to first in sorted list
  const featuredSermon = sortedSermons.find(s => s.isFeatured) || sortedSermons[0];
  const moreSermons = sortedSermons.filter(s => s.id !== (featuredSermon?.id || -1)).slice(0, 2);

  if (sermons.length === 0) return null;

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="section-heading">Latest Messages</span>
          <h2 className="section-title mt-5">
            Sermons
          </h2>
          <p className="section-subtitle mt-4">
            Life-changing messages that inspire, encourage, and strengthen your faith journey.
          </p>
        </div>

        {/* Featured Sermon - Full Width */}
        {featuredSermon && (
          <div className="mb-10">
            <Card className="glass-card overflow-hidden hover-lift border-0">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Video Thumbnail */}
                <div className="relative aspect-video md:aspect-auto bg-muted overflow-hidden group cursor-pointer">
                  <img
                    src={`https://img.youtube.com/vi/${featuredSermon.videoId}/hqdefault.jpg`}
                    alt={featuredSermon.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500">
                      <Play className="w-8 h-8 text-primary ml-1" />
                    </div>
                  </div>
                  <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground border-0">
                    Featured
                  </Badge>
                  <span className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-medium">
                    {featuredSermon.duration}
                  </span>
                </div>
                {/* Info */}
                <div className="p-8 flex flex-col justify-center space-y-5">
                  <div>
                    <Badge variant="outline" className="mb-3 text-[10px]">
                      {sermonSeries.find(s => s.id === featuredSermon.seriesId)?.title || 'Latest Series'}
                    </Badge>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-3 leading-tight">{featuredSermon.title}</h3>
                    <p className="text-muted-foreground leading-relaxed line-clamp-3">{featuredSermon.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{featuredSermon.pastor}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{featuredSermon.date}</span>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{featuredSermon.views.toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{featuredSermon.likes} likes</span>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button variant="gradient" className="hover-lift" onClick={() => window.open(`https://youtube.com/watch?v=${featuredSermon.videoId}`, '_blank')}>
                      <Play className="w-4 h-4 mr-2" /> Watch Now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* More Sermons Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {moreSermons.map((sermon) => (
            <Card key={sermon.id} className="glass-card overflow-hidden hover-lift border-0 group cursor-pointer" onClick={() => window.open(`https://youtube.com/watch?v=${sermon.videoId}`, '_blank')}>
              <div className="flex gap-0 h-full">
                {/* Mini Thumbnail */}
                <div className="relative w-44 shrink-0 bg-muted overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`}
                    alt={sermon.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                      <Play className="w-5 h-5 text-primary ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-medium">
                    {sermon.duration}
                  </span>
                </div>
                {/* Info */}
                <div className="p-5 flex flex-col justify-center space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] shrink-0">{sermon.category}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {sermonSeries.find(s => s.id === sermon.seriesId)?.title}
                    </span>
                  </div>
                  <h3 className="font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {sermon.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{sermon.pastor}</span>
                    <span>{sermon.date}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Explore More */}
        <div className="text-center">
          <Link href="/sermons">
            <Button variant="gradient" size="lg" className="hover-lift px-10 gap-2">
              Explore More Sermons <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
