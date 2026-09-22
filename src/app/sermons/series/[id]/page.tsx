"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  Share2,
  Heart,
  Eye,
  ChevronRight,
  Tv,
  FileText,
  MonitorPlay,
  Link as LinkIcon,
  CheckCircle2,
  MoreVertical,
  ExternalLink
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

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sermonSeries, getVisibleSermons, currentUser } = useAdminData();
  const { goBack } = useNavigationHistory();
  const [activeCampusId, setActiveCampusId] = useState('global');

  React.useEffect(() => {
    setActiveCampusId(localStorage.getItem('grace_activeCampus') || 'global');
  }, []);

  const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);
  
  const series = sermonSeries.find(s => s.id === id || s._id === id);
  const seriesSermons = visibleSermons.filter(s => s.seriesId === id || s.seriesId === series?.id);
  
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [videoStats, setVideoStats] = useState<Record<string, { viewCount: string, publishedAt: string, duration?: string }>>({});

  const videoIdsString = seriesSermons.map(s => s.videoId).join(',');

  React.useEffect(() => {
    if (!videoIdsString) return;
    fetch(`/api/youtube/stats?ids=${videoIdsString}`)
      .then(res => res.json())
      .then(data => {
        if (data.stats) setVideoStats(data.stats);
      })
      .catch(console.error);
  }, [videoIdsString]);

  React.useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [selectedVideoId]);

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
      <div className="container mx-auto px-4 sm:px-6 page-back-offset pb-2">
        <div className="page-back-bar mb-4">
          <Button onClick={() => goBack("/sermons")} variant="ghost" className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Back to All Series</span>
          </Button>
        </div>
        
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-[#E5D5C5]/50 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6 mb-4">
          <div className="space-y-1 sm:space-y-2 max-w-2xl">
            {series.category && (
              <Badge className="bg-[#8B2323]/10 text-[#8B2323] border-0 px-2.5 py-0.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest mb-1">
                {series.category}
              </Badge>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-[#1A202C] leading-tight uppercase">{series.title}</h1>
            {series.description && series.description !== series.title && (
              <p className="text-[#7A6150] leading-relaxed text-xs sm:text-sm md:text-base uppercase">{series.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-start md:self-auto mt-1 md:mt-0">
            {activeSermon?.pastor && (
              <div className="flex flex-col items-start md:items-end justify-center">
                <span className="text-[9px] sm:text-[10px] text-[#7A6150] uppercase font-bold tracking-widest leading-none mb-1">Pastor</span>
                <span className="text-base sm:text-lg font-bold text-[#1A202C] leading-none">{activeSermon.pastor}</span>
              </div>
            )}
            <div className="flex flex-col items-start md:items-end justify-center pl-4 sm:pl-6 border-l border-[#E5D5C5]/50">
              <span className="text-[9px] sm:text-[10px] text-[#7A6150] uppercase font-bold tracking-widest leading-none mb-1">Total Messages</span>
              <span className="text-xl sm:text-2xl font-bold text-[#8B2323] leading-none">{seriesSermons.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 mt-4 max-w-4xl pb-20">
        <h3 className="text-xl font-bold flex items-center gap-2 px-2 mb-6 text-[#1A202C] uppercase tracking-wider">
          <Play className="w-5 h-5 text-[#8B2323]" /> Series Content
        </h3>
        <div className="space-y-4">
          {seriesSermons.length === 0 && (
            <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-[#E5D5C5] bg-white/60">
              <Tv className="w-10 h-10 text-[#8B2323]/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#1A202C]">No sermons in this series yet</p>
              <p className="text-xs text-[#7A6150] mt-1">Add a sermon and assign it to this series to see it here.</p>
            </div>
          )}
          <AnimatePresence>
            {seriesSermons.map((sermon, index) => {
              const isActive = selectedVideoId === sermon.videoId;
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
                    setSelectedVideoId(isActive ? null : sermon.videoId);
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
                            {sermon.description && sermon.description.length > 100 && (
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
      </div>
    </div>
  );
}
