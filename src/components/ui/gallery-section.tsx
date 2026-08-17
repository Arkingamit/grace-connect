"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Download, Share2, Heart, Calendar, User, Loader2, Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Search, Lock, Maximize2 } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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
        }
      }

      for (const album of galleryAlbums) {
        if (!fetchedAlbums.current.has(album.id) && album.url && !album.coverImage) {
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
    // Sort by sortOrder
    return [...galleryAlbums].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [galleryAlbums]);

  const fetchAlbumPreview = async (album: any) => {
    setSelectedAlbum(album);
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
            <h2 className="section-title">Photo Gallery</h2>
            <p className="section-subtitle">
              Capturing moments of faith, fellowship, and community
            </p>
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

                          <Badge 
                            variant="glass"
                            className={`absolute top-4 left-4 border-0 transition-opacity duration-300 gallery-3d-card-inner ${
                              shouldCompress ? 'opacity-0' : 'opacity-100'
                            }`}
                          >
                            {album.category}
                          </Badge>

                          <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-1 gallery-3d-card-inner">
                              <h3 className="text-2xl font-bold italic tracking-tight">{album.title}</h3>
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
                  <Badge variant="glass" className="mb-2 text-primary">{selectedAlbum.category}</Badge>
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

              {/* Photos Grid */}
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
                         <p className="text-muted-foreground italic">Unable to fetch preview photos. Please check the album link.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
                <p className="text-sm text-muted-foreground italic">
                  Showing {previewPhotos.length} preview photos from the album
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="rounded-full px-8 border-border/50" onClick={closePreview}>
                    Close
                  </Button>
                  <a href={selectedAlbum.url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-full px-10 font-bold hover-lift gap-2">
                       View Full Album <Share2 className="w-4 h-4" />
                    </Button>
                  </a>
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
  const { getVisibleGalleryAlbums } = useAdminData();

  const member = getSessionMember();
  const effectiveGroups = member ? getEffectiveGroups(member) : [];
  
  const userGroups = effectiveGroups.length > 0
    ? Array.from(new Set([...effectiveGroups]))
    : ['all'];

  const galleryAlbums = getVisibleGalleryAlbums('all', userGroups as string[]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});
  
  // Album dialog details state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchedAlbums = React.useRef<Set<string>>(new Set());

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
        }
      }

      for (const album of galleryAlbums) {
        if (!fetchedAlbums.current.has(album.id) && album.url && !album.coverImage) {
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
  }, [selectedCategory, searchQuery]);

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      albums = albums.filter(album => 
        album.title.toLowerCase().includes(q) || 
        (album.description && album.description.toLowerCase().includes(q))
      );
    }

    return [...albums].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [galleryAlbums, selectedCategory, searchQuery, session, member]);

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
                The photo gallery is reserved for signed-in members of Grace Community Church. Please sign in to browse albums of our worship and community life.
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
      {/* Navigation Header */}
      <div 
        className={`sticky top-0 z-50 glass-header border-b border-primary/10 transition-all duration-300 ease-in-out ${
          isScrolledDown ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/#gallery">
            <Button variant="ghost" size="sm" className="gap-2 group rounded-full">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
          <div className="text-center flex-1 pr-20">
            <h1 className="text-xl font-bold tracking-tight italic border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none md:border-l-0 md:pl-0">Grace Photo Gallery</h1>
          </div>
        </div>
      </div>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold text-heading">Full Album Collection</h2>
              <p className="text-lg sm:text-xl text-subheading max-w-2xl mx-auto">
                Explore our full library of memories captured across events and fellowship.
              </p>
            </div>

            {/* Search and Filters Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 backdrop-blur-md p-6 rounded-3xl border border-primary/5">

              {/* Search Bar */}
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 rounded-full border-border/50 bg-background/50 focus:bg-background transition-all"
                />
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



                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-lg font-bold italic tracking-tight">{album.title}</h3>
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



                            <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                              <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-1">
                                  <h3 className="text-2xl font-bold italic tracking-tight">{album.title}</h3>
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
              <div className="space-y-2 pr-6 text-left">
                <Badge variant="glass" className="bg-primary/10 text-primary border-0 w-max">{selectedAlbum?.category}</Badge>
                <DialogTitle className="text-3xl font-bold italic tracking-tight text-left">{selectedAlbum?.title}</DialogTitle>
                <p className="text-muted-foreground text-base leading-relaxed text-left">
                  {selectedAlbum?.description}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={handleShareAlbum}
                  variant="outline" 
                  className="rounded-full border-border/40 gap-2 h-11 px-5 w-full sm:w-auto"
                >
                  <Share2 className="w-4.5 h-4.5" />
                  Share Album
                </Button>
                <Button 
                  asChild 
                  className="rounded-full px-6 gap-2 h-11 shadow-lg shadow-primary/15 hover:scale-[1.02] transition-all w-full sm:w-auto"
                >
                  <a href={selectedAlbum?.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                    View Full Google Album <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
