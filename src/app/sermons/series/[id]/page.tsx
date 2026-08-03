"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminData } from '@/lib/admin-data-context';
import { useNavigationHistory } from '@/components/ui/navigation-history-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Calendar, 
  User, 
  Clock, 
  ArrowLeft,
  Share2,
  Heart,
  Eye,
  ChevronRight,
  Tv,
  FileText,
  MonitorPlay,
  Link as LinkIcon,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sermonSeries, getVisibleSermons, currentUser } = useAdminData();
  const { goBack } = useNavigationHistory();
  const [activeCampusId, setActiveCampusId] = useState('global');

  React.useEffect(() => {
    setActiveCampusId(localStorage.getItem('grace_activeCampus') || 'global');
  }, []);

  const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);
  
  const series = sermonSeries.find(s => s.id === id);
  const seriesSermons = visibleSermons.filter(s => s.seriesId === id);
  
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    seriesSermons[0]?.videoId || null
  );

  if (!series) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <h2 className="text-3xl font-bold mb-4">Series Not Found</h2>
        <Button asChild>
          <Link href="/sermons">Return to Sermons</Link>
        </Button>
      </div>
    );
  }

  const activeSermon = seriesSermons.find(s => s.videoId === selectedVideoId) || seriesSermons[0];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="container mx-auto px-6 pt-10 pb-6">
        <Button variant="ghost" onClick={() => goBack("/sermons")} className="mb-6 hover:bg-primary/10 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to All Series
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/50">
          <div className="space-y-3 max-w-2xl">
            <Badge className="bg-primary/10 text-primary border-0 px-3 py-1 text-[10px] uppercase font-bold tracking-widest">
              {series.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{series.title}</h1>
            <p className="text-muted-foreground leading-relaxed italic">{series.description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <div className="flex flex-col items-end">
               <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total Messages</span>
               <span className="text-2xl font-bold text-primary">{seriesSermons.length}</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
               <Tv className="w-6 h-6 text-primary" />
             </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-8">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Player Area */}
          <div className="lg:col-span-2 space-y-8">
            {selectedVideoId ? (
              <div className="space-y-6">
                <div className="aspect-video rounded-3xl overflow-hidden glass-card p-1 shadow-2xl">
                  <iframe
                    className="w-full h-full rounded-2xl shadow-inner bg-black"
                    src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                
                {activeSermon && (
                  <div className="glass-card p-8 rounded-3xl border-0 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold group-hover:text-primary transition-colors italic">
                          {activeSermon.title}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5">
                            <User className="w-3.5 h-3.5" /> {activeSermon.pastor}
                          </span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {activeSermon.date}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {activeSermon.duration}</span>
                        </div>
                      </div>

                    </div>
                    <p className="text-muted-foreground leading-relaxed text-lg italic border-l-2 border-primary/20 pl-4">
                      {activeSermon.description}
                    </p>

                    {activeSermon.materials && activeSermon.materials.length > 0 && (
                      <div className="pt-6 border-t border-border/50">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Sermon Materials</h3>
                        <div className="flex flex-wrap gap-3">
                          {activeSermon.materials.map((mat, idx) => {
                            const Icon = mat.type === 'notes' ? FileText :
                                         mat.type === 'presentation' || mat.type === 'canva' ? MonitorPlay :
                                         LinkIcon;
                            
                            return (
                              <a 
                                key={idx} 
                                href={mat.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300 font-medium text-sm border border-primary/20 hover:shadow-lg hover:shadow-primary/25"
                              >
                                <Icon className="w-4 h-4" />
                                {mat.title}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video rounded-3xl bg-muted flex items-center justify-center border-2 border-dashed border-border/50">
                 <div className="text-center">
                   <Play className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                   <p className="text-muted-foreground">Select a message to start watching</p>
                 </div>
              </div>
            )}
          </div>

          {/* Sidebar Playlist */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 px-2">
              <Play className="w-5 h-5 text-primary" /> Playlist Content
            </h3>
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 scrollbar-hide">
              {seriesSermons.map((sermon, index) => (
                <Card 
                  key={sermon.id} 
                  className={`group overflow-hidden border-0 cursor-pointer transition-all duration-300 ${
                    selectedVideoId === sermon.videoId 
                    ? 'bg-primary/10 ring-1 ring-primary/20 scale-[1.02]' 
                    : 'glass-hover-card'
                  }`}
                  onClick={() => setSelectedVideoId(sermon.videoId)}
                >
                  <div className="flex items-center h-28 gap-0">
                    <div className="relative w-32 shrink-0 h-full overflow-hidden bg-muted">
                      <img 
                        src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`}
                        alt={sermon.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Play className="w-6 h-6 text-white text-primary" />
                      </div>
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                        {index + 1}
                      </div>
                    </div>
                    <div className="p-4 flex-1 min-w-0 flex flex-col justify-center space-y-1">
                      <h4 className={`font-bold text-sm line-clamp-2 leading-snug transition-colors ${
                        selectedVideoId === sermon.videoId ? 'text-primary' : ''
                      }`}>
                        {sermon.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                        {sermon.duration} · {sermon.date}
                      </p>
                    </div>
                    <div className="px-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
