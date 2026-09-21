"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { useNavigationHistory } from '@/components/ui/navigation-history-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Tv, 
  ChevronRight, 
  Play, 
  User,
  ArrowLeft,
  ChevronLeft,
  FileText,
  MonitorPlay,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Clock,
  Eye
} from 'lucide-react';

// Format ISO 8601 duration to MM:SS or HH:MM:SS
function formatDuration(isoString?: string) {
  if (!isoString) return '';
  const match = isoString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = match[1] ? parseInt(match[1]) : 0;
  const m = match[2] ? parseInt(match[2]) : 0;
  const s = match[3] ? parseInt(match[3]) : 0;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format views (e.g. 15K views)
function formatViews(views?: string) {
  if (!views) return '';
  const num = parseInt(views);
  if (isNaN(num)) return '';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  return `${num} views`;
}

import { formatDDMMYYYY } from '@/lib/date-utils';

// Format Date
function formatDate(isoString?: string) {
  return formatDDMMYYYY(isoString);
}

export default function SermonsPage() {
  const { sermonSeries, sermons, getVisibleSermons, currentUser } = useAdminData();
  const { goBack } = useNavigationHistory();
  const [search, setSearch] = useState('');
  const [activePastor, setActivePastor] = useState('All');
  const [activeCampusId, setActiveCampusId] = useState('global');
  const [viewMode, setViewMode] = useState<'series' | 'sermons'>('series');
  const [videoStats, setVideoStats] = useState<Record<string, { viewCount: string, publishedAt: string, duration?: string }>>({});
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  React.useEffect(() => {
    setActiveCampusId(localStorage.getItem('grace_activeCampus') || 'global');
  }, []);

  const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);

  // Fetch YouTube stats safely in chunks of 50
  React.useEffect(() => {
    const videoIds = visibleSermons.map(s => s.videoId).filter(Boolean);
    if (videoIds.length === 0) return;

    const fetchStats = async () => {
      const allStats: Record<string, any> = {};
      for (let i = 0; i < videoIds.length; i += 50) {
        const chunk = videoIds.slice(i, i + 50).join(',');
        try {
          const res = await fetch(`/api/youtube/stats?ids=${chunk}`);
          const data = await res.json();
          if (data.stats) {
            Object.assign(allStats, data.stats);
          }
        } catch (error) {
          console.error("Error fetching stats chunk:", error);
        }
      }
      setVideoStats(allStats);
    };

    fetchStats();
  }, [visibleSermons.length]);

  const pastors = ['All', ...Array.from(new Set(visibleSermons.map(s => s.pastor).filter(Boolean)))];

  const filteredSeries = sermonSeries.filter(series => {
    const seriesSermons = visibleSermons.filter(s => s.seriesId === series.id);
    const matchesSearch = series.title.toLowerCase().includes(search.toLowerCase()) || 
                         series.description.toLowerCase().includes(search.toLowerCase()) ||
                         seriesSermons.some(s => s.pastor?.toLowerCase().includes(search.toLowerCase()));
    
    const matchesPastor = activePastor === 'All' || seriesSermons.some(s => s.pastor === activePastor);
    
    return matchesSearch && matchesPastor && seriesSermons.length > 0;
  });

  const filteredSermons = visibleSermons.filter(sermon => {
    const matchesSearch = sermon.title.toLowerCase().includes(search.toLowerCase()) || 
                         sermon.description?.toLowerCase().includes(search.toLowerCase());
    const matchesPastor = activePastor === 'All' || sermon.pastor === activePastor;
    return matchesSearch && matchesPastor;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header with Back Button */}
      <div className="container mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="sticky top-4 z-50 flex items-center w-fit mb-2">
          <Button onClick={() => goBack("/")} variant="ghost" className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Sermons</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="container mx-auto px-4 sm:px-6 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-2xl border-0">
          <div className="flex gap-2 p-1 bg-background/50 rounded-xl w-full md:w-auto">
            <Button 
              variant={viewMode === 'series' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('series')}
              className="flex-1 md:flex-none rounded-lg"
            >
              Series
            </Button>
            <Button 
              variant={viewMode === 'sermons' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('sermons')}
              className="flex-1 md:flex-none rounded-lg"
            >
              Sermons
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search series or topics..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={activePastor} onValueChange={setActivePastor}>
                <SelectTrigger className="w-full rounded-xl bg-background/50 border-input text-foreground h-10">
                  <SelectValue placeholder="Filter by Pastor" />
                </SelectTrigger>
                <SelectContent>
                  {pastors.map(p => (
                    <SelectItem key={p} value={p}>{p === 'All' ? 'All Pastors' : p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Series Grid */}
      <div className="container mx-auto px-4 sm:px-6">
        {viewMode === 'series' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSeries.map((series) => {
              const seriesSermons = visibleSermons.filter(s => s.seriesId === series.id);
              const latestSermon = seriesSermons[0];

              return (
                <Link href={`/sermons/series/${series.id}`} key={series.id} className="group">
                  <Card className="glass-card h-full overflow-hidden border-0 hover-lift transition-all duration-500">
                    <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                      {latestSermon ? (
                        <>
                          <img 
                            src={`https://img.youtube.com/vi/${latestSermon.videoId}/hqdefault.jpg`}
                            alt={series.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center justify-center text-[10px] font-semibold text-white tracking-wider z-10">
                            {videoStats[latestSermon.videoId]?.duration ? formatDuration(videoStats[latestSermon.videoId].duration) : latestSermon.duration || '0:00'}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <Tv className="w-12 h-12 text-primary/20" />
                        </div>
                      )}
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground border-0">
                        {series.category}
                      </Badge>
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{series.title}</h4>
                      {latestSermon && (
                        <p className="text-[12px] text-muted-foreground font-medium tracking-wide mb-3">
                          {videoStats[latestSermon.videoId]?.viewCount && (
                            <span>{formatViews(videoStats[latestSermon.videoId].viewCount)} • </span>
                          )}
                          {videoStats[latestSermon.videoId]?.publishedAt ? formatDate(videoStats[latestSermon.videoId].publishedAt) : latestSermon.date}
                        </p>
                      )}
                      {series.description && series.description !== series.title && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 min-h-[40px]">
                          {series.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium">{latestSermon?.pastor || 'Pastor Geo'}</span>
                        </div>
                        <span className="inline-flex items-center h-8 text-xs font-semibold text-primary group/btn">
                          View Series <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            <AnimatePresence>
              {filteredSermons.map((sermon, index) => {
                const isActive = playingVideoId === sermon.videoId;
                const series = sermonSeries.find(s => s.id === sermon.seriesId);
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 180, damping: 24 }}
                    key={sermon.id} 
                    className={`group overflow-hidden cursor-pointer rounded-2xl ${
                      isActive 
                      ? 'bg-white shadow-xl border border-[#E5D5C5]/60 p-3 sm:p-5' 
                      : 'bg-white border border-[#E5D5C5]/50 hover:bg-white/80 p-2.5 sm:p-3 shadow-xs'
                    }`}
                    onClick={() => {
                      setPlayingVideoId(isActive ? null : sermon.videoId);
                      setIsDescriptionExpanded(false);
                    }}
                  >
                    {isActive ? (
                      <motion.div layout className="space-y-4 sm:space-y-5 cursor-default">
                        <motion.div layoutId={`media-${sermon.id}`} transition={{ type: "spring", stiffness: 180, damping: 24 }} style={{ zIndex: 10 }} className="aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-sm bg-black relative">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${sermon.videoId}?autoplay=1`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </motion.div>
                        
                        <div className="space-y-3 sm:space-y-4 px-0.5">
                          <motion.h2 
                            layoutId={`title-${sermon.id}`} 
                            transition={{ type: "spring", stiffness: 180, damping: 24 }}
                            style={{ originX: 0, originY: 0, zIndex: 0 }}
                            className="text-base sm:text-xl md:text-2xl font-bold text-[#1A202C] leading-snug"
                          >
                            {sermon.title}
                          </motion.h2>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                            <div className="flex items-center gap-2 bg-[#EDE0E0]/70 rounded-full px-3 py-1.5 border border-[#E5D5C5]/60 w-fit">
                              <div className="w-5 h-5 rounded-full bg-[#8B2323]/10 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-[#8B2323]" />
                              </div>
                              <div className="flex items-baseline gap-1.5 leading-none">
                                <span className="text-[10px] uppercase font-bold text-[#7A6150] tracking-wider">Pastor</span>
                                <span className="text-xs sm:text-sm font-bold text-[#1A202C]">{sermon.pastor || 'Pastor Geo'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2.5 text-xs text-[#7A6150] font-medium flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#8B2323] shrink-0" />
                                <span>{videoStats[sermon.videoId]?.publishedAt ? formatDate(videoStats[sermon.videoId].publishedAt) : sermon.date}</span>
                              </div>
                              
                              {(videoStats[sermon.videoId]?.duration || sermon.duration) && (
                                <>
                                  <span className="text-[#E5D5C5]">•</span>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#8B2323] shrink-0" />
                                    <span>{videoStats[sermon.videoId]?.duration ? formatDuration(videoStats[sermon.videoId].duration) : sermon.duration}</span>
                                  </div>
                                </>
                              )}

                              {videoStats[sermon.videoId]?.viewCount && (
                                <>
                                  <span className="text-[#E5D5C5]">•</span>
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-[#8B2323] shrink-0" />
                                    <span>{formatViews(videoStats[sermon.videoId].viewCount)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {sermon.description && (
                            <div className="bg-[#FAF7F5] rounded-xl p-3 sm:p-3.5 border border-[#E5D5C5]/40 mt-1">
                              <p className={`text-xs sm:text-sm text-[#7A6150] leading-relaxed font-normal transition-all duration-300 ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                                {sermon.description}
                              </p>
                              {sermon.description.length > 100 && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDescriptionExpanded(!isDescriptionExpanded);
                                  }}
                                  className="text-[11px] sm:text-xs font-bold text-[#8B2323] hover:text-[#8B2323]/80 mt-1.5 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                >
                                  {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                                </button>
                              )}
                            </div>
                          )}

                          {sermon.materials && sermon.materials.length > 0 && (
                            <div className="pt-3.5 border-t border-[#E5D5C5]/50">
                              <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-[#7A6150]">Sermon Materials</h3>
                              <div className="flex flex-col gap-2">
                                {sermon.materials.map((mat, idx) => {
                                  const Icon = mat.type === 'notes' ? FileText :
                                               mat.type === 'presentation' || mat.type === 'canva' ? MonitorPlay :
                                               LinkIcon;
                                  
                                  return (
                                    <a 
                                      key={idx} 
                                      href={mat.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="group flex w-full items-stretch rounded-xl bg-[#FAF7F5] border border-[#E5D5C5]/60 text-[#8B2323] hover:bg-[#F3EDE8] transition-all overflow-hidden shadow-xs"
                                    >
                                      <div className="flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-semibold flex-1 min-w-0">
                                        <Icon className="w-4 h-4 shrink-0 text-[#8B2323]" strokeWidth={2} />
                                        <span className="truncate text-[#1A202C]">{mat.title}</span>
                                      </div>
                                      <div className="flex items-center justify-center px-3 border-l border-[#E5D5C5]/60 bg-[#EDE0E0]/40 group-hover:bg-[#EDE0E0]/70 transition-colors shrink-0">
                                        <ExternalLink className="w-3.5 h-3.5 text-[#8B2323]" strokeWidth={2} />
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div layout className="flex items-center gap-3 sm:gap-4 cursor-pointer">
                        <motion.div 
                          layoutId={`media-${sermon.id}`} 
                          transition={{ type: "spring", stiffness: 180, damping: 24 }} 
                          style={{ zIndex: 10 }} 
                          className="relative w-[110px] sm:w-[140px] aspect-video shrink-0 overflow-hidden rounded-xl bg-muted"
                        >
                          <img 
                            src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`}
                            alt={sermon.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white border border-white/20 shadow-sm">
                            {index + 1}
                          </div>
                          {(videoStats[sermon.videoId]?.duration || sermon.duration) && (
                            <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold text-white tracking-wider">
                              {videoStats[sermon.videoId]?.duration ? formatDuration(videoStats[sermon.videoId].duration) : sermon.duration}
                            </div>
                          )}
                        </motion.div>
                        <motion.div layout className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                          <motion.h2 
                            layoutId={`title-${sermon.id}`} 
                            transition={{ type: "spring", stiffness: 180, damping: 24 }}
                            style={{ originX: 0, originY: 0, zIndex: 0 }}
                            className="text-xs sm:text-sm font-bold text-[#1A202C] leading-snug line-clamp-2 mb-1"
                          >
                            {sermon.title}
                          </motion.h2>
                          <motion.div layout className="text-[11px] sm:text-xs text-[#7A6150] font-medium flex items-center gap-1.5 flex-wrap">
                            {videoStats[sermon.videoId]?.viewCount && (
                              <>
                                <span>{formatViews(videoStats[sermon.videoId].viewCount)}</span>
                                <span className="text-[#E5D5C5]">•</span>
                              </>
                            )}
                            <span>{videoStats[sermon.videoId]?.publishedAt ? formatDate(videoStats[sermon.videoId].publishedAt) : sermon.date}</span>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {((viewMode === 'series' && filteredSeries.length === 0) || (viewMode === 'sermons' && filteredSermons.length === 0)) && (
          <div className="text-center py-32 glass-card rounded-3xl border-0">
            <Tv className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2">No {viewMode === 'series' ? 'Series' : 'Sermons'} Found</h3>
            <p className="text-muted-foreground mb-8">Try adjusting your search or category filters.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setActivePastor('All'); }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
