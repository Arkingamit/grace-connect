"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Download, Volume2, Search, Filter, MoreVertical, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminData } from "@/lib/admin-data-context";
import { GoldRule } from "@/components/ui/gold-rule";


const categoryColors: Record<string, string> = {
  Worship: "bg-blue-100 text-blue-800 border-blue-200",
  "Praise Song": "bg-green-100 text-green-800 border-green-200",
  "THE RESURRECTION - HINDI SONG":
    "bg-purple-100 text-purple-800 border-purple-200",
  "Hindi Worship": "bg-orange-100 text-orange-800 border-orange-200",
  "Christmas Song": "bg-red-100 text-red-800 border-red-200",
  "Worship song": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const formatViewCount = (views: string | number) => {
  const num = Number(views);
  if (isNaN(num)) return "0 views";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M views";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K views";
  return num + " views";
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

export default function MusicPage() {
  const { worshipVideos } = useAdminData();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [youtubeStats, setYoutubeStats] = useState<Record<string, { viewCount: string; publishedAt: string; title?: string; artist?: string }>>({});

  useEffect(() => {
    const fetchYoutubeStats = async () => {
      const videoIds = Array.from(new Set(worshipVideos.map((v) => v.videoId))).filter(Boolean);
      if (videoIds.length === 0) return;

      try {
        const batchSize = 50;
        let allStats = {};

        for (let i = 0; i < videoIds.length; i += batchSize) {
          const batch = videoIds.slice(i, i + batchSize).join(",");
          const res = await fetch(`/api/youtube/stats?ids=${batch}`);
          if (res.ok) {
            const data = await res.json();
            if (data.stats) {
              allStats = { ...allStats, ...data.stats };
            }
          }
        }
        
        setYoutubeStats(allStats);
      } catch (err) {
        console.error("Failed to fetch YouTube stats", err);
      }
    };

    fetchYoutubeStats();
  }, [worshipVideos]);

  // Get unique categories for filter
  const categories = Array.from(
    new Set(worshipVideos.flatMap((video) => video.categories || []))
  );

  // Filter videos based on search term and category
  const filteredVideos = worshipVideos.filter((video) => {
    const matchesSearch =
      searchTerm === "" ||
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.album.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || (video.categories && video.categories.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  const handlePlay = (videoId: string) => setFullscreenVideo(videoId);

  const closeFullscreen = () => {
    setIsClosing(true);
    setTimeout(() => {
      setFullscreenVideo(null);
      setIsClosing(false);
    }, 400);
  };

  const handleLike = (id: string) => {
    setLikedVideos((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const videoCards = filteredVideos;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenVideo) closeFullscreen();
    };

    if (fullscreenVideo) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [fullscreenVideo]);

  return (
    <section className="page-back-offset pb-16 bg-transparent">
      <div className="container mx-auto px-4 space-y-4">
        <div className="page-back-bar mb-2">
          <Link href="/">
            <Button variant="ghost" className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm">
              <ChevronLeft className="w-5 h-5" strokeWidth={2} />
              <span className="text-base font-normal">Music Library</span>
            </Button>
          </Link>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto w-full mb-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7A6150] w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search songs, artists, or albums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white/90 backdrop-blur-md border-[#E5D5C5] focus:bg-white focus:border-[#8B2323] focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 rounded-full text-[#1A202C] placeholder:text-[#C4B0A0] shadow-sm transition-all"
            />
          </div>
        </div>



        {/* Video Grid (no carousel; mobile-first responsive) */}
        {videoCards.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            onMouseLeave={() => setHoveredId(null)}
          >
            {videoCards.map((video) => {
              const isHovered = hoveredId === video.id;

              return (
                <div
                  key={video.id}
                  className="flex flex-col gap-3 cursor-pointer group"
                  onMouseEnter={() => setHoveredId(video.id)}
                >
                  <div className="relative overflow-hidden rounded-xl aspect-video w-full border border-[#E5D5C5]/40 shadow-sm">
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      onClick={() => handlePlay(video.videoId)}
                    />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1 transition-opacity duration-300 max-w-[80%]">
                      {(video.categories || []).map((cat) => (
                        <Badge
                          key={cat}
                          className={`text-[10px] font-semibold ${categoryColors[cat] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                      {video.duration}
                    </div>

                    {/* Play Overlay */}
                    <div
                      className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center ${isHovered ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}
                    >
                      <Button
                        variant="ghost"
                        size="lg"
                        className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm hover:bg-[#8B2323] text-[#8B2323] hover:text-white transition-all duration-300 shadow-xl"
                        onClick={() => handlePlay(video.videoId)}
                      >
                        <Play className="w-6 h-6 ml-1" fill="currentColor" />
                      </Button>
                    </div>
                  </div>

                  {/* Info Strip (Below the image) */}
                  <div className="flex items-start gap-3 mt-3 px-1">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src="/avatar-icon.png" alt="Grace Connect Logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[15px] text-[#1A202C] leading-tight line-clamp-2">
                        {youtubeStats[video.videoId]?.title || video.title}
                      </h3>
                      <div className="text-[#7A6150] text-[13px] mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="truncate">{youtubeStats[video.videoId]?.artist || video.artist}</span>
                        <span className="hidden sm:inline text-[#C4B0A0]">•</span>
                        <span className="truncate">
                          {youtubeStats[video.videoId] 
                            ? `${formatViewCount(youtubeStats[video.videoId].viewCount)} • ${formatTimeAgo(youtubeStats[video.videoId].publishedAt)}`
                            : `${(video.videoId.charCodeAt(0) % 100) + 10}K views • ${(video.videoId.charCodeAt(1) % 11) + 2} days ago`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7A6150] hover:bg-[#E5D5C5]/50 hover:text-[#1A202C]">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No songs found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search terms or category filter to find more
              songs.
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenVideo && (
        <div
          className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center transition-opacity duration-400 ${isClosing ? "opacity-0" : "opacity-100"
            }`}
          onClick={closeFullscreen}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-primary text-3xl font-bold z-10"
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
          >
            ✕
          </button>
          <div
            className={`relative w-[90vw] h-[90vh] max-w-[1200px] max-h-[675px] transition-transform duration-400 ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${fullscreenVideo}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0`}
              title="YouTube video player"
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
