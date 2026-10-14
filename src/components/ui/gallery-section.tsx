"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Download, Share2, Heart, Calendar, User, Loader2, Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Search, Lock, Maximize2, Film, Play, Video, Plus, Clock, Eye } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getAlbumTimestamp } from '@/lib/types';
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/youtube';

function formatViews(views?: string | number): string {
  if (!views) return '';
  const num = typeof views === 'string' ? parseInt(views.replace(/,/g, ''), 10) : views;
  if (isNaN(num)) return String(views);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  return `${num.toLocaleString()} views`;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const id = extractYoutubeVideoId(url);
  if (id) {
    return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
  }
  return null;
}

const ITEMS_PER_PAGE = 6;

const categoryColors = {
  Worship: "bg-worship text-worship-text",
  Fellowship: "bg-fellowship text-fellowship-text",
  Music: "bg-music text-music-text",
  Youth: "bg-youth text-youth-text",
  Outreach: "bg-outreach text-outreach-text",
  Baptism: "bg-baptism text-baptism-text"
};



export function GallerySection({ variant = 'widget' }: { variant?: 'page' | 'widget' }) {
  if (variant === 'page') return <GalleryPageLayout />;
  return <GalleryWidgetLayout />;
}

function GalleryWidgetLayout() {
  const { getVisibleGalleryAlbums, groups } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  
  const sessionMember = getSessionMember();
  const effectiveGroups = sessionMember ? getEffectiveGroups(sessionMember) : [];
  
  const userGroups = effectiveGroups.length > 0
    ? Array.from(new Set([...effectiveGroups]))
    : ['all'];

  const galleryAlbums = getVisibleGalleryAlbums('all', userGroups as string[]);

  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [previewPhotos, setPreviewPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photos' | 'videos'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});

  const fetchedAlbums = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchCovers = async () => {
      let changed = false;
      const newCovers: Record<string, string> = {};

      for (const album of galleryAlbums) {
        if (album.coverImage && !fetchedAlbums.current.has(album.id)) {
          fetchedAlbums.current.add(album.id);
          newCovers[album.id] = album.coverImage;
          changed = true;
        } else if (!album.coverImage && !fetchedAlbums.current.has(album.id)) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) {
            fetchedAlbums.current.add(album.id);
            newCovers[album.id] = youtubeThumbnailUrl(ytId);
            changed = true;
          }
        }
      }

      for (const album of galleryAlbums) {
        if (!fetchedAlbums.current.has(album.id) && album.url && !album.coverImage) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) continue;
          fetchedAlbums.current.add(album.id);
          try {
            const res = await fetch(
              `/api/gallery/photos?url=${encodeURIComponent(album.url)}&albumId=${encodeURIComponent(album.id)}&persistCover=1`
            );
            if (!res.ok) {
              const errorData = await res.json();
              console.error(`API Error for album ${album.id}:`, errorData.error);
              continue;
            }
            const data = await res.json();
            if (data.coverImage || (data.photos && data.photos.length > 0)) {
              newCovers[album.id] = data.coverImage || data.photos[0].src;
              changed = true;
            }
          } catch (err) {
            console.error(`Failed to fetch cover for album ${album.id}:`, err);
          }
        }
      }

      if (changed) {
        setAlbumCovers(prev => ({ ...prev, ...newCovers }));
      }
    };

    if (galleryAlbums.length > 0) {
      fetchCovers();
    }
  }, [galleryAlbums]);

  const filteredAlbums = useMemo(() => {
    let albums = galleryAlbums;
    if (selectedMediaType !== 'all') {
      albums = albums.filter(a => {
        const m = a.mediaType || 'both';
        if (selectedMediaType === 'photos') return m === 'photos' || m === 'both';
        if (selectedMediaType === 'videos') return m === 'videos' || m === 'both' || !!a.videoUrl || Boolean(extractYoutubeVideoId(a.url));
        return true;
      });
    }
    if (selectedCategory !== 'All') {
      albums = albums.filter(a => a.category === selectedCategory);
    }
    return [...albums].sort((a, b) => {
      const timeA = getAlbumTimestamp(a);
      const timeB = getAlbumTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
    });
  }, [galleryAlbums, selectedMediaType, selectedCategory]);

  const fetchAlbumPreview = async (album: any) => {
    setSelectedAlbum(album);
    const isVideo = album.mediaType === 'videos' || Boolean(extractYoutubeVideoId(album.videoUrl || album.url));
    if (isVideo) {
      setLoading(false);
      setPreviewPhotos([]);
      return;
    }
    setLoading(true);
    setPreviewPhotos([]);
    try {
      if (!album.url) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/gallery/photos?url=${encodeURIComponent(album.url)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch photos');
      }
      const data = await res.json();
      if (data.photos) {
        setPreviewPhotos(data.photos);
      }
    } catch (err) {
      console.error('Failed to fetch album photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => {
    setSelectedAlbum(null);
    setPreviewPhotos([]);
  };

  // Group albums into rows of 3 to match previous layout
  const allAlbumRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < filteredAlbums.length; i += 3) {
      rows.push(filteredAlbums.slice(i, i + 3));
    }
    return rows;
  }, [filteredAlbums]);

  // Home page limit: 6 albums (2 rows of 3)
  const displayRows = allAlbumRows.slice(0, 2);
  const hasMore = galleryAlbums.length > (displayRows.length * 3);

  return (
    <section id="gallery" className="py-10 sm:py-16 bg-transparent">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto relative bg-white/60 dark:bg-card/60 backdrop-blur-2xl border-4 border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] rounded-[3rem] p-8 sm:p-12 transition-all duration-700 hover:shadow-[0_45px_70px_-15px_rgba(139,35,35,0.2)] hover:-translate-y-2">
          {/* Inner bezel to give 3D frame depth */}
          <div className="absolute inset-0 border-[3px] border-white/50 rounded-[3rem] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-[3rem] pointer-events-none" />
          
          {/* Section Header */}
          <div className="relative z-10 text-center space-y-5 mb-12">
            <span className="section-heading">Gallery</span>
            <h2 className="section-title">Gallery</h2>
            <p className="section-subtitle">
              Capturing moments of faith, fellowship, and worship in photos and videos
            </p>

            {/* Media Type Filter Tabs */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {([
                { id: 'all' as const, label: 'All Media', icon: undefined },
                { id: 'photos' as const, label: 'Photos', icon: ImageIcon },
                { id: 'videos' as const, label: 'Videos', icon: Play },
              ]).map(tab => {
                const Icon = tab.icon;
                const active = selectedMediaType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedMediaType(tab.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-[#8B2323] text-white shadow-sm'
                        : 'bg-white/80 border border-[#E5D5C5]/60 text-[#7A6150] hover:bg-white'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 ${tab.id === 'videos' && active ? 'fill-white' : ''}`} />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>



          {/* Album Rows */}
          <div className="space-y-4 mb-8 min-h-[400px]">
            {/* Mobile View: Clean 1-column scrollable grid without hover expansion */}
            <div className="grid grid-cols-1 gap-4 sm:hidden">
              {filteredAlbums.slice(0, 6).map(album => (
                <div
                  key={album.id}
                  className="relative overflow-hidden rounded-2xl cursor-pointer glass-card border-0 h-56"
                  onClick={() => fetchAlbumPreview(album)}
                >
                  {/* Album Cover */}
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center relative">
                    {(album.coverImage || albumCovers[album.id]) ? (
                      <img 
                        src={album.coverImage || albumCovers[album.id]} 
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-primary/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  </div>



                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-lg font-bold italic tracking-tight">{album.title}</h3>
                    {(album.viewCount || album.date) && (
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                        {album.viewCount && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-rose-300" /> {formatViews(album.viewCount)}
                          </span>
                        )}
                        {album.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-rose-300" /> {album.date}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/Tablet View: Interactive expanding row flex layout */}
            <div className="hidden sm:block space-y-4">
              {displayRows.map((row, rowIndex) => {
                const isRowHovered = row.some(p => p.id === hoveredId);

                return (
                  <div key={rowIndex} className="flex gap-4 h-72" onMouseLeave={() => setHoveredId(null)}>
                    {row.map(album => {
                      const isHovered = hoveredId === album.id;
                      const shouldCompress = isRowHovered && !isHovered;

                      return (
                        <div
                          key={album.id}
                          className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-out glass-card border border-white/10 gallery-3d-card ${
                            isHovered ? 'flex-[2.5]' : shouldCompress ? 'flex-[0.6]' : 'flex-1'
                          }`}
                          onMouseEnter={() => setHoveredId(album.id)}
                          onClick={() => fetchAlbumPreview(album)}
                        >
                          {/* Album Cover */}
                          <div className="w-full h-full bg-primary/5 flex items-center justify-center group overflow-hidden">
                            {(album.coverImage || albumCovers[album.id]) ? (
                              <img 
                                src={album.coverImage || albumCovers[album.id]} 
                                alt={album.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <ImageIcon className="w-16 h-16 text-primary/10 group-hover:scale-110 transition-transform duration-700" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          </div>

                          {album.duration && (
                            <div className={`absolute top-4 left-4 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-opacity duration-300 ${shouldCompress ? 'opacity-0' : 'opacity-100'}`}>
                              <Clock className="w-2.5 h-2.5 text-rose-400" />
                              <span>{album.duration}</span>
                            </div>
                          )}

                          {(album.mediaType === 'videos' || album.videoUrl) && (
                            <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-opacity duration-300 ${shouldCompress ? 'opacity-0' : 'opacity-100'}`}>
                              <Play className="w-3 h-3 fill-white" />
                              <span>Videos</span>
                            </div>
                          )}

                          <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-1.5 gallery-3d-card-inner">
                              <h3 className="text-2xl font-bold italic tracking-tight">{album.title}</h3>
                              {(album.viewCount || album.date) && (
                                <div className="flex items-center gap-2.5 text-xs text-white/85">
                                  {album.viewCount && (
                                    <span className="flex items-center gap-1">
                                      <Eye className="w-3.5 h-3.5 text-rose-300" /> {formatViews(album.viewCount)}
                                    </span>
                                  )}
                                  {album.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-rose-300" /> {album.date}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {!isHovered && (
                            <div className={`absolute bottom-6 left-6 right-6 transition-opacity duration-300 gallery-3d-card-inner ${shouldCompress ? 'opacity-0' : 'opacity-100'}`}>
                               <h3 className="text-xl font-bold text-white italic truncate">{album.title}</h3>
                            </div>
                          )}

                          {shouldCompress && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <h3 className="text-white font-bold text-center px-2 transform -rotate-90 whitespace-nowrap italic text-sm opacity-50">
                                {album.title}
                              </h3>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Invisible placeholders to maintain 3-column width */}
                    {Array.from({ length: 3 - row.length }).map((_, i) => (
                      <div 
                        key={`empty-${rowIndex}-${i}`} 
                        className={`transition-all duration-500 ease-out pointer-events-none opacity-0 ${
                          isRowHovered ? 'flex-[0.6]' : 'flex-1'
                        }`} 
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
            
            {galleryAlbums.length === 0 && (
              <div className="text-center py-32 glass-card rounded-3xl border-0">
                <ImageIcon className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-2 italic">No Albums Available</h3>
                <p className="text-muted-foreground">Check back later for photos from our recent events.</p>
              </div>
            )}
            
            {filteredAlbums.length === 0 && galleryAlbums.length > 0 && (
              <div className="text-center py-32 glass-card rounded-3xl border-0">
                <p className="text-muted-foreground">No albums found in the "{selectedCategory}" category.</p>
                <Button variant="ghost" className="mt-4" onClick={() => setSelectedCategory('All')}>
                  Clear Filter
                </Button>
              </div>
            )}

          {/* Explore More Button */}
          {hasMore && (
            <div className="flex justify-center mt-12 mb-8">
              <Link href="/gallery">
                <Button variant="secondary" size="lg" className="rounded-full px-12 group">
                  Explore Full Gallery 
                  <Share2 className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal (Popup) */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="relative max-w-5xl w-full glass-card border-0 overflow-hidden shadow-2xl p-1">
            <div className="bg-background/40 p-8 rounded-[1.5rem] space-y-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {selectedAlbum.category && selectedAlbum.category.toLowerCase() !== 'general' && (
                      <Badge variant="glass" className="text-primary">{selectedAlbum.category}</Badge>
                    )}
                    {(selectedAlbum.mediaType === 'videos' || selectedAlbum.videoUrl || extractYoutubeVideoId(selectedAlbum.url)) && (
                      <Badge variant="glass" className="bg-rose-50 text-rose-600 border-0 flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" /> Video
                      </Badge>
                    )}
                    {selectedAlbum.duration && (
                      <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                        <Clock className="w-3 h-3 text-[#8B2323]" /> {selectedAlbum.duration}
                      </Badge>
                    )}
                    {selectedAlbum.viewCount && (
                      <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                        <Eye className="w-3 h-3 text-[#8B2323]" /> {formatViews(selectedAlbum.viewCount)}
                      </Badge>
                    )}
                    {selectedAlbum.date && (
                      <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                        <Calendar className="w-3 h-3 text-[#8B2323]" /> {selectedAlbum.date}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight italic">{selectedAlbum.title}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10"
                  onClick={closePreview}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              {/* Featured Video if album contains video or is a YouTube video */}
              {(() => {
                const videoSource = selectedAlbum.videoUrl || (extractYoutubeVideoId(selectedAlbum.url) ? selectedAlbum.url : null);
                if (!videoSource) return null;
                const embedUrl = getYouTubeEmbedUrl(videoSource);
                return (
                  <div className="w-full max-w-3xl mx-auto">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-rose-600 fill-rose-600" /> Video Playback
                    </h3>
                    {embedUrl ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-border/50 bg-black">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          title={selectedAlbum.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        src={videoSource}
                        controls
                        className="w-full rounded-2xl aspect-video bg-black object-cover"
                      />
                    )}
                  </div>
                );
              })()}

              {/* Photos Grid - only show for albums with photos */}
              {selectedAlbum.mediaType !== 'videos' && !extractYoutubeVideoId(selectedAlbum.url) && (
                <div className="relative min-h-[300px]">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-muted-foreground animate-pulse text-sm font-bold uppercase tracking-widest">Fetching moments...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                      {previewPhotos.map((photo, i) => (
                        <div key={i} className="aspect-square relative rounded-2xl overflow-hidden glass-card p-1 group">
                          <img
                            src={photo.src}
                            alt={photo.title}
                            className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                      {previewPhotos.length === 0 && !loading && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center space-y-4">
                           <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
                           <p className="text-muted-foreground italic">View full album with all high-resolution photos and videos below.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
                <p className="text-sm text-muted-foreground italic">
                  {selectedAlbum.mediaType === 'videos' || extractYoutubeVideoId(selectedAlbum.videoUrl || selectedAlbum.url)
                    ? 'Individual YouTube video streaming'
                    : previewPhotos.length > 0 
                      ? `Showing ${previewPhotos.length} preview photos from the album` 
                      : 'Photos and videos available in shared album'}
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="rounded-full px-8 border-border/50" onClick={closePreview}>
                    Close
                  </Button>
                  {selectedAlbum.mediaType === 'videos' || extractYoutubeVideoId(selectedAlbum.videoUrl || selectedAlbum.url) ? (
                    <a href={selectedAlbum.videoUrl || selectedAlbum.url} target="_blank" rel="noopener noreferrer">
                      <Button className="rounded-full px-10 font-bold hover-lift gap-2 bg-rose-700 hover:bg-rose-800 text-white shadow-sm">
                         Watch on YouTube <Play className="w-4 h-4 fill-current ml-0.5" />
                      </Button>
                    </a>
                  ) : (
                    <a href={selectedAlbum.url} target="_blank" rel="noopener noreferrer">
                      <Button className="rounded-full px-10 font-bold hover-lift gap-2">
                         View Album (Photos & Videos) <Share2 className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}


function GalleryPageLayout() {
  const { session, getSessionMember, getEffectiveGroups } = useAuth();
  const { getVisibleGalleryAlbums, addGalleryAlbum } = useAdminData();
  const searchParams = useSearchParams();
  const albumParam = searchParams?.get('album');

  const member = getSessionMember();
  const effectiveGroups = member ? getEffectiveGroups(member) : [];
  
  const userGroups = effectiveGroups.length > 0
    ? Array.from(new Set([...effectiveGroups]))
    : ['all'];

  const galleryAlbums = getVisibleGalleryAlbums('all', userGroups as string[]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photos' | 'videos'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});
  
  // Album dialog details state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

  // Upload video state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '',
    videoUrl: '',
    category: 'General',
    description: '',
    duration: '',
    viewCount: '',
    date: '',
  });

  const [fetchingYoutube, setFetchingYoutube] = useState(false);
  const youtubeFetchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedVideoId = React.useRef<string | null>(null);

  const applyYoutubeMetadata = async (videoId: string) => {
    if (lastFetchedVideoId.current === videoId) return;
    setFetchingYoutube(true);
    try {
      const res = await fetch(`/api/youtube/stats?ids=${encodeURIComponent(videoId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const meta = data.stats?.[videoId];
      if (!meta?.title && !meta?.durationLabel && !meta?.dateLabel) return;
      lastFetchedVideoId.current = videoId;
      setVideoForm(prev => ({
        ...prev,
        title: meta.title || prev.title,
        description: meta.description || prev.description,
        duration: meta.durationLabel || prev.duration,
        viewCount: meta.viewCount || prev.viewCount,
        date: meta.dateLabel || prev.date,
      }));
    } catch (err) {
      console.error("Failed to auto-fetch video details from YouTube:", err);
    } finally {
      setFetchingYoutube(false);
    }
  };

  const handleVideoUrlChange = (url: string) => {
    const videoId = extractYoutubeVideoId(url);
    if (videoId !== lastFetchedVideoId.current) lastFetchedVideoId.current = null;
    setVideoForm(f => ({ ...f, videoUrl: url }));
    if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
    if (!videoId) return;
    youtubeFetchTimer.current = setTimeout(() => {
      void applyYoutubeMetadata(videoId);
    }, 350);
  };

  const fetchedAlbums = React.useRef<Set<string>>(new Set());

  // Deep linking to album/video
  useEffect(() => {
    if (albumParam && galleryAlbums.length > 0) {
      const match = galleryAlbums.find(a => a.id === albumParam || a._id === albumParam);
      if (match) {
        setSelectedAlbum(match);
        setIsPreviewOpen(true);
      }
    }
  }, [albumParam, galleryAlbums]);

  // Fetch album covers
  useEffect(() => {
    const fetchCovers = async () => {
      let changed = false;
      const newCovers: Record<string, string> = {};

      for (const album of galleryAlbums) {
        if (album.coverImage && !fetchedAlbums.current.has(album.id)) {
          fetchedAlbums.current.add(album.id);
          newCovers[album.id] = album.coverImage;
          changed = true;
        } else if (!album.coverImage && !fetchedAlbums.current.has(album.id)) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) {
            fetchedAlbums.current.add(album.id);
            newCovers[album.id] = youtubeThumbnailUrl(ytId);
            changed = true;
          }
        }
      }

      for (const album of galleryAlbums) {
        if (!fetchedAlbums.current.has(album.id) && album.url && !album.coverImage) {
          const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
          if (ytId) continue;
          fetchedAlbums.current.add(album.id);
          try {
            const res = await fetch(
              `/api/gallery/photos?url=${encodeURIComponent(album.url)}&albumId=${encodeURIComponent(album.id)}&persistCover=1`
            );
            if (!res.ok) {
              const errorData = await res.json();
              console.error(`API Error for album ${album.id}:`, errorData.error);
              continue;
            }
            const data = await res.json();
            if (data.coverImage || (data.photos && data.photos.length > 0)) {
              newCovers[album.id] = data.coverImage || data.photos[0].src;
              changed = true;
            }
          } catch (err) {
            console.error(`Failed to fetch cover for album ${album.id}:`, err);
          }
        }
      }

      if (changed) {
        setAlbumCovers(prev => ({ ...prev, ...newCovers }));
      }
    };

    if (galleryAlbums.length > 0) {
      fetchCovers();
    }
  }, [galleryAlbums]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedMediaType, searchQuery]);

  const categories = useMemo(() => {
    if (!session || !member) return [];
    return ["All", ...Array.from(new Set(galleryAlbums.map(a => a.category)))];
  }, [galleryAlbums, session, member]);

  const filteredAlbums = useMemo(() => {
    if (!session || !member) return [];
    let albums = galleryAlbums;

    if (selectedCategory !== "All") {
      albums = albums.filter(album => album.category === selectedCategory);
    }

    if (selectedMediaType === 'photos') {
      albums = albums.filter(album => (album.mediaType || 'both') === 'photos' || (album.mediaType || 'both') === 'both');
    } else if (selectedMediaType === 'videos') {
      albums = albums.filter(album => (album.mediaType || 'both') === 'videos' || (album.mediaType || 'both') === 'both' || !!album.videoUrl || Boolean(extractYoutubeVideoId(album.url)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      albums = albums.filter(album => 
        Boolean(album.title && album.title.toLowerCase().includes(q)) || 
        Boolean(album.description && album.description.toLowerCase().includes(q)) ||
        Boolean(album.category && album.category.toLowerCase().includes(q))
      );
    }

    return [...albums].sort((a, b) => {
      const timeA = getAlbumTimestamp(a);
      const timeB = getAlbumTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
    });
  }, [galleryAlbums, selectedCategory, selectedMediaType, searchQuery, session, member]);

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const ytId = extractYoutubeVideoId(videoForm.videoUrl);
    if (!ytId) {
      import('sonner').then(({ toast }) => toast.error('Please enter a valid YouTube video link'));
      return;
    }
    if (!videoForm.title.trim()) {
      import('sonner').then(({ toast }) => toast.error('Please enter a video title'));
      return;
    }
    setUploadLoading(true);
    try {
      const res = await fetch('/api/gallery/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoForm.title.trim(),
          videoUrl: videoForm.videoUrl.trim(),
          category: videoForm.category || 'General',
          description: videoForm.description.trim(),
          duration: videoForm.duration,
          viewCount: videoForm.viewCount,
          date: videoForm.date,
          campusId: member?.campusId || 'all',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload video');
      }

      const created = await res.json();
      import('sonner').then(({ toast }) => toast.success('YouTube video added to gallery!'));
      setIsUploadOpen(false);
      lastFetchedVideoId.current = null;
      if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
      setVideoForm({ title: '', videoUrl: '', category: 'General', description: '', duration: '', viewCount: '', date: '' });
      addGalleryAlbum({
        title: created.title,
        description: created.description,
        url: created.url,
        videoUrl: created.videoUrl,
        category: created.category,
        coverImage: created.coverImage,
        duration: created.duration,
        viewCount: created.viewCount,
        date: created.date,
        mediaType: 'videos',
        targetCampuses: created.targetCampuses,
        targetGroups: created.targetGroups,
      });
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error(err.message || 'Failed to upload video'));
    } finally {
      setUploadLoading(false);
    }
  };

  // Paginated albums
  const paginatedAlbums = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlbums.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlbums, currentPage]);

  const totalPages = Math.ceil(filteredAlbums.length / ITEMS_PER_PAGE);

  // Group current page albums into rows of 3 to preserve the interactive hover effect
  const albumRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < paginatedAlbums.length; i += 3) {
      rows.push(paginatedAlbums.slice(i, i + 3));
    }
    return rows;
  }, [paginatedAlbums]);

  const fetchAlbumPreview = async (album: any) => {
    setSelectedAlbum(album);
    setIsPreviewOpen(true);
  };

  const handleShareAlbum = async () => {
    if (!selectedAlbum) return;
    try {
      await navigator.share({
        title: selectedAlbum.title,
        text: selectedAlbum.description,
        url: window.location.origin + `/gallery?album=${selectedAlbum.id}`,
      });
    } catch (err) {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.origin + `/gallery?album=${selectedAlbum.id}`);
      alert("Album link copied to clipboard!");
    }
  };



  // Auth gate check
  if (!session || !member) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        <Card className="max-w-md w-full border-border/50 shadow-elevated bg-card/40 backdrop-blur-md relative z-10">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight italic">Members Only Gallery</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The gallery is reserved for signed-in members of Grace Community Church. Please sign in to browse photos, videos, and albums of our worship and community life.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <Link href="/login">
                <Button className="w-full rounded-full">Sign In</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full rounded-full">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pb-16">
      <section className="pt-2 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Search Bar & Media Filter */}
            <div className="space-y-3">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
                <Input
                  type="text"
                  placeholder="Search albums, photos & videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-11 rounded-2xl border-[#E5D5C5]/60 bg-white/85 text-[#1A202C] placeholder:text-[#7A6150]/60 focus-visible:ring-[#8B2323]/20 shadow-xs"
                />
              </div>

              {/* Media Type & Category Tabs + Upload Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {([
                    { id: 'all' as const, label: 'All Media', icon: undefined },
                    { id: 'photos' as const, label: 'Photos', icon: ImageIcon },
                    { id: 'videos' as const, label: 'Videos', icon: Play },
                  ]).map(tab => {
                    const Icon = tab.icon;
                    const active = selectedMediaType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedMediaType(tab.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          active
                            ? 'bg-[#8B2323] text-white shadow-xs'
                            : 'bg-white/80 border border-[#E5D5C5]/60 text-[#7A6150] hover:bg-white'
                        }`}
                      >
                        {Icon && <Icon className={`w-3.5 h-3.5 ${tab.id === 'videos' && active ? 'fill-white' : ''}`} />}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="h-8 rounded-full bg-[#8B2323] hover:bg-[#721515] text-white text-xs font-bold px-3.5 gap-1.5 shadow-sm hover-lift shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload Video
                  </Button>
                </div>
              </div>
            </div>

            {/* Album Grid / Hover Layout */}
            <div className="space-y-4 min-h-[400px]">
              {/* Mobile View: Clean 1-column scrollable grid without hover expansion */}
              <div className="grid grid-cols-1 gap-4 sm:hidden">
                {paginatedAlbums.map(album => (
                  <div
                    key={album.id}
                    className="relative overflow-hidden rounded-2xl cursor-pointer glass-card border-0 h-56"
                    onClick={() => fetchAlbumPreview(album)}
                  >
                    {/* Album Cover */}
                    <div className="w-full h-full bg-primary/5 flex items-center justify-center relative">
                      {(album.coverImage || albumCovers[album.id]) ? (
                        <img 
                          src={album.coverImage || albumCovers[album.id]} 
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-primary/10" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    </div>



                    {album.duration && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm z-10">
                        <Clock className="w-2.5 h-2.5 text-rose-400" />
                        <span>{album.duration}</span>
                      </div>
                    )}

                    {(album.mediaType === 'videos' || album.videoUrl) && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>Videos</span>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-lg font-bold italic tracking-tight">{album.title}</h3>
                      {(album.viewCount || album.date) && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                          {album.viewCount && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-rose-300" /> {formatViews(album.viewCount)}
                            </span>
                          )}
                          {album.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-rose-300" /> {album.date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/Tablet View: Interactive expanding row flex layout */}
              <div className="hidden sm:block space-y-4">
                {albumRows.map((row, rowIndex) => {
                  const isRowHovered = row.some(p => p.id === hoveredId);

                  return (
                    <div key={rowIndex} className="flex gap-4 h-72" onMouseLeave={() => setHoveredId(null)}>
                      {row.map(album => {
                        const isHovered = hoveredId === album.id;
                        const shouldCompress = isRowHovered && !isHovered;

                        return (
                          <div
                            key={album.id}
                            className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-out glass-card border-0 ${
                              isHovered ? 'flex-[2.5]' : shouldCompress ? 'flex-[0.6]' : 'flex-1'
                            }`}
                            onMouseEnter={() => setHoveredId(album.id)}
                            onClick={() => fetchAlbumPreview(album)}
                          >
                            {/* Album Cover */}
                            <div className="w-full h-full bg-primary/5 flex items-center justify-center group overflow-hidden relative">
                              {(album.coverImage || albumCovers[album.id]) ? (
                                <img 
                                  src={album.coverImage || albumCovers[album.id]} 
                                  alt={album.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                              ) : (
                                <ImageIcon className="w-16 h-16 text-primary/10 group-hover:scale-110 transition-transform duration-700" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            </div>

                            {album.duration && (
                              <div className={`absolute top-4 left-4 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-opacity duration-300 ${shouldCompress ? 'opacity-0' : 'opacity-100'}`}>
                                <Clock className="w-2.5 h-2.5 text-rose-400" />
                                <span>{album.duration}</span>
                              </div>
                            )}

                            {(album.mediaType === 'videos' || album.videoUrl) && (
                              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-opacity duration-300">
                                <Play className="w-3 h-3 fill-white" />
                                <span>Videos</span>
                              </div>
                            )}

                            <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                              <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-1.5">
                                <h3 className="text-2xl font-bold italic tracking-tight">{album.title}</h3>
                                {(album.viewCount || album.date) && (
                                  <div className="flex items-center gap-2.5 text-xs text-white/85">
                                    {album.viewCount && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="w-3.5 h-3.5 text-rose-300" /> {formatViews(album.viewCount)}
                                      </span>
                                    )}
                                    {album.date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-rose-300" /> {album.date}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {!isHovered && (
                              <div className={`absolute bottom-6 left-6 right-6 transition-opacity duration-300 ${shouldCompress ? 'opacity-0' : 'opacity-100'}`}>
                                 <h3 className="text-xl font-bold text-white italic truncate">{album.title}</h3>
                              </div>
                            )}

                            {shouldCompress && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <h3 className="text-white font-bold text-center px-2 transform -rotate-90 whitespace-nowrap italic text-sm opacity-50">
                                  {album.title}
                                </h3>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Invisible placeholders to maintain 3-column width */}
                      {Array.from({ length: 3 - row.length }).map((_, i) => (
                        <div 
                          key={`empty-${rowIndex}-${i}`} 
                          className={`transition-all duration-500 ease-out pointer-events-none opacity-0 ${
                            isRowHovered ? 'flex-[0.6]' : 'flex-1'
                          }`} 
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
              
              {filteredAlbums.length === 0 && (
                <div className="text-center py-24 glass-card rounded-3xl border-0">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-1 italic">No Albums Found</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? "Try checking your spelling or search terms." : "No albums available under this category."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination className="pt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={`cursor-pointer ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer rounded-full"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={`cursor-pointer ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </section>

      {/* Album Preview dialog with grid of photos */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-primary/10 rounded-3xl">
          {/* Header */}
          <DialogHeader className="p-6 sm:p-8">
            <div className="flex flex-col gap-5">
              <div className="space-y-2 text-center flex flex-col items-center px-4">
                <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                  {selectedAlbum?.category && selectedAlbum.category.toLowerCase() !== 'general' && (
                    <Badge variant="glass" className="bg-primary/10 text-primary border-0 w-max">{selectedAlbum?.category}</Badge>
                  )}
                  {selectedAlbum?.mediaType === 'videos' || selectedAlbum?.videoUrl || extractYoutubeVideoId(selectedAlbum?.url) ? (
                    <Badge variant="glass" className="bg-rose-50 text-rose-600 border-0 flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" /> Videos
                    </Badge>
                  ) : null}
                  {selectedAlbum?.duration && (
                    <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                      <Clock className="w-3 h-3 text-[#8B2323]" /> {selectedAlbum.duration}
                    </Badge>
                  )}
                  {selectedAlbum?.viewCount && (
                    <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                      <Eye className="w-3 h-3 text-[#8B2323]" /> {formatViews(selectedAlbum.viewCount)}
                    </Badge>
                  )}
                  {selectedAlbum?.date && (
                    <Badge variant="outline" className="text-xs gap-1 border-stone-300 text-stone-700 bg-stone-50/80">
                      <Calendar className="w-3 h-3 text-[#8B2323]" /> {selectedAlbum.date}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-3xl font-bold italic tracking-tight text-center">{selectedAlbum?.title}</DialogTitle>
                <p className="text-muted-foreground text-base leading-relaxed text-center">
                  {selectedAlbum?.description}
                </p>
              </div>

              {/* Video Player if videoUrl or YouTube link available */}
              {(() => {
                const videoSource = selectedAlbum?.videoUrl || (extractYoutubeVideoId(selectedAlbum?.url) ? selectedAlbum?.url : null);
                if (!videoSource) return null;
                const embedUrl = getYouTubeEmbedUrl(videoSource);
                return (
                  <div className="w-full max-w-md mx-auto">
                    {embedUrl ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-border/50 bg-black">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          title={selectedAlbum?.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        src={videoSource}
                        controls
                        className="w-full rounded-2xl aspect-video bg-black object-cover"
                      />
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-sm mx-auto">
                <Button 
                  onClick={handleShareAlbum}
                  variant="outline" 
                  className="rounded-full border-border/40 gap-2 h-11 px-5 w-full sm:w-auto"
                >
                  <Share2 className="w-4.5 h-4.5" />
                  Share Album
                </Button>
                {selectedAlbum?.mediaType === 'videos' || extractYoutubeVideoId(selectedAlbum?.videoUrl || selectedAlbum?.url) ? (
                  <Button 
                    asChild 
                    className="rounded-full px-6 gap-2 h-11 bg-rose-700 hover:bg-rose-800 text-white shadow-lg shadow-rose-900/15 hover:scale-[1.02] transition-all w-full sm:w-auto"
                  >
                    <a href={selectedAlbum?.videoUrl || selectedAlbum?.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                      Watch on YouTube <Play className="w-4 h-4 fill-current ml-1" />
                    </a>
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    className="rounded-full px-6 gap-2 h-11 shadow-lg shadow-primary/15 hover:scale-[1.02] transition-all w-full sm:w-auto"
                  >
                    <a href={selectedAlbum?.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                      View Album (Photos & Videos) <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Upload Video Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md p-6 bg-background rounded-3xl border border-[#E5D5C5]/60 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold italic tracking-tight flex items-center gap-2">
              <Play className="w-5 h-5 text-rose-600 fill-rose-600" /> Upload YouTube Video
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Add an individual YouTube video directly to the church gallery</p>
          </DialogHeader>

          <form onSubmit={handleUploadVideo} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gallery-video-url" className="text-xs font-semibold">YouTube Video URL *</Label>
              <div className="relative">
                <Input
                  id="gallery-video-url"
                  value={videoForm.videoUrl}
                  onChange={e => handleVideoUrlChange(e.target.value)}
                  onBlur={e => {
                    const ytId = extractYoutubeVideoId(e.target.value);
                    if (ytId) void applyYoutubeMetadata(ytId);
                  }}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  required
                  className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pl-9"
                />
                <Play className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-600 fill-rose-600" />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                {fetchingYoutube ? (
                  <span className="text-[#8B2323] font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching title, duration, views, and description from YouTube…
                  </span>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>Supports YouTube links, shorts, or youtu.be links.</span>
                  </>
                )}
              </p>
            </div>

            {/* Thumbnail Live Preview */}
            {(() => {
              const ytId = extractYoutubeVideoId(videoForm.videoUrl);
              if (!ytId) return null;
              return (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-3 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                  <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-black/10 border border-black/5 shadow-xs">
                    <img src={youtubeThumbnailUrl(ytId)} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xs">
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                    </div>
                    {videoForm.duration && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[8px] font-semibold flex items-center gap-0.5">
                        <Clock className="w-2 h-2 text-rose-400" />
                        <span>{videoForm.duration}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#1A202C] truncate">
                        {videoForm.title || (fetchingYoutube ? "Fetching details from YouTube..." : "YouTube Video Connected")}
                      </p>
                      {fetchingYoutube && <Loader2 className="w-3 h-3 animate-spin text-[#8B2323] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#7A6150]">
                      {videoForm.duration && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-2.5 h-2.5 text-[#8B2323]" />
                          {videoForm.duration}
                        </span>
                      )}
                      {videoForm.viewCount && (
                        <span className="flex items-center gap-1 font-medium">
                          <Eye className="w-2.5 h-2.5 text-[#8B2323]" />
                          {formatViews(videoForm.viewCount)}
                        </span>
                      )}
                      {videoForm.date && (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-2.5 h-2.5 text-[#8B2323]" />
                          {videoForm.date}
                        </span>
                      )}
                      {!videoForm.duration && !videoForm.viewCount && !fetchingYoutube && (
                        <span className="text-rose-700/80">Thumbnail ready</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label htmlFor="gallery-video-title" className="text-xs font-semibold">Video Title *</Label>
              <div className="relative">
                <Input
                  id="gallery-video-title"
                  value={videoForm.title}
                  onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Sunday Worship Highlights"
                  required
                  className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pr-8 text-xs"
                />
                {fetchingYoutube && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#8B2323]" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="gallery-video-dur" className="text-[11px] font-semibold flex items-center gap-1 text-[#3A2D27]">
                  <Clock className="w-3 h-3 text-[#8B2323]" /> Duration
                </Label>
                <Input
                  id="gallery-video-dur"
                  value={videoForm.duration || ''}
                  onChange={e => setVideoForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="4:32"
                  className="h-9 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs px-2.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gallery-video-views" className="text-[11px] font-semibold flex items-center gap-1 text-[#3A2D27]">
                  <Eye className="w-3 h-3 text-[#8B2323]" /> Views
                </Label>
                <Input
                  id="gallery-video-views"
                  value={videoForm.viewCount || ''}
                  onChange={e => setVideoForm(f => ({ ...f, viewCount: e.target.value }))}
                  placeholder="1.2K"
                  className="h-9 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs px-2.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gallery-video-date" className="text-[11px] font-semibold flex items-center gap-1 text-[#3A2D27]">
                  <Calendar className="w-3 h-3 text-[#8B2323]" /> Date
                </Label>
                <Input
                  id="gallery-video-date"
                  value={videoForm.date || ''}
                  onChange={e => setVideoForm(f => ({ ...f, date: e.target.value }))}
                  placeholder="12 May 2024"
                  className="h-9 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs px-2.5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gallery-video-desc" className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                id="gallery-video-desc"
                value={videoForm.description}
                onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief notes or description about this video moment..."
                className="rounded-xl min-h-[60px] text-xs bg-[#FAF7F2] border-[#E5D5C5]/60"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-full text-xs h-9 px-4 border-[#E5D5C5]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadLoading}
                className="rounded-full bg-[#8B2323] hover:bg-[#721515] text-white text-xs h-9 px-5 gap-1.5 shadow-sm"
              >
                {uploadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Upload Video
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
