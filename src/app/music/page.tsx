"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Download, Volume2, Search, Filter } from "lucide-react";
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

export default function MusicPage() {
  const { worshipVideos } = useAdminData();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <h2 className="text-4xl font-bold border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none md:border-l-0 md:pl-0">Music Library</h2>
          <GoldRule />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our complete collection of worship music, hymns, and
            spiritual songs. Find the perfect melody to lift your spirit and
            connect with God.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search songs, artists, or albums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-500">
          Showing {filteredVideos.length} of {worshipVideos.length} songs
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
                  className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-500 ease-out group"
                  onMouseEnter={() => setHoveredId(video.id)}
                >
                  <div className="h-56 sm:h-64 md:h-72">
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      onClick={() => handlePlay(video.videoId)}
                    />
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1 transition-opacity duration-300 max-w-[80%]">
                    {(video.categories || []).map((cat) => (
                      <Badge
                        key={cat}
                        className={`text-xs ${categoryColors[cat] ||
                          "bg-gray-100 text-gray-800 border-gray-200"
                          }`}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>

                  {/* Play Overlay */}
                  <div
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center ${isHovered ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                      }`}
                  >
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm hover:bg-primary text-primary hover:text-white transition-all duration-300"
                      onClick={() => handlePlay(video.videoId)}
                    >
                      <Play className="w-6 h-6 ml-1" fill="currentColor" />
                    </Button>
                  </div>

                  {/* Video Info Overlay on Hover (desktop only) */}
                  {isHovered && (
                    <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {video.title}
                      </h3>
                      <p className="text-white/80 text-sm mb-2">
                        {video.artist}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-xs">
                          {video.duration}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-white hover:text-red-400 transition-colors ${likedVideos.has(video.id) ? "text-red-400" : ""
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(video.id);
                          }}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={
                              likedVideos.has(video.id) ? "currentColor" : "none"
                            }
                          />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Mobile info strip */}
                  <div className="md:hidden absolute bottom-0 left-0 right-0 bg-black/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {video.title}
                        </h3>
                        <p className="text-white/70 text-xs truncate">
                          {video.artist}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-white hover:text-red-400 transition-colors flex-shrink-0 ${likedVideos.has(video.id) ? "text-red-400" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(video.id);
                        }}
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={
                            likedVideos.has(video.id) ? "currentColor" : "none"
                          }
                        />
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
