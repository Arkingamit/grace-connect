"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';


// Sermon video data
const sermonVideos = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Finding Purpose in God\'s Plan',
    speaker: 'Pastor John Smith',
    date: 'December 15, 2024',
    duration: '45 min'
  },
  {
    id: 'fLexgOxsZu0',
    title: 'Walking in Faith',
    speaker: 'Pastor Sarah Johnson',
    date: 'December 8, 2024',
    duration: '38 min'
  },
  {
    id: 'L_jWHffIx5E',
    title: 'God\'s Grace in Hard Times',
    speaker: 'Pastor Mike Davis',
    date: 'December 1, 2024',
    duration: '42 min'
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Building Community',
    speaker: 'Pastor John Smith',
    date: 'November 24, 2024',
    duration: '35 min'
  },
  {
    id: 'Zi_XLOBDo_Y',
    title: 'The Power of Prayer',
    speaker: 'Pastor Sarah Johnson',
    date: 'November 17, 2024',
    duration: '40 min'
  }
];

interface VideoCarouselProps {
  className?: string;
}

export const VideoCarousel: React.FC<VideoCarouselProps> = ({ className }) => {
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const swiperRef = useRef<any>(null);

  const getThumbnailUrl = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleThumbnailClick = (videoId: string) => {
    setFullscreenVideo(videoId);
    setIsClosing(false);
  };

  const closeFullscreen = () => {
    setIsClosing(true);
    setTimeout(() => {
      setFullscreenVideo(null);
      setIsClosing(false);
    }, 400);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && fullscreenVideo) {
      closeFullscreen();
    }
  };

  useEffect(() => {
    if (fullscreenVideo) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [fullscreenVideo]);

  return (
    <>
      <section className={`py-12 sm:py-24 bg-gradient-to-br from-background via-background/95 to-primary/5 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent mb-6">
              Recent Sermons
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Watch our latest messages and be inspired by God's word. Join us on a journey of spiritual growth and discovery.
            </p>
          </div>

          <div className="relative">
            <Swiper
              ref={swiperRef}
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              loop={true}
              slidesPerView="auto"
              speed={1000}
              autoplay={{
                delay: 6000,
                disableOnInteraction: false,
              }}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 120,
                modifier: 2.5,
                slideShadows: false
              }}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              pagination={{
                el: '.swiper-pagination',
                clickable: true,
              }}
              modules={[EffectCoverflow, Navigation, Pagination, Autoplay]}
              className="sermon-carousel h-[520px] py-12"
            >
              {sermonVideos.map((video, index) => (
                <SwiperSlide key={video.id} className="w-[370px]">
                  <Card className="group relative h-[420px] overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-500">
                    <div 
                      className="relative h-full cursor-pointer"
                      onClick={() => handleThumbnailClick(video.id)}
                    >
                      <img 
                        src={getThumbnailUrl(video.id)}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Play button */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:scale-110 shadow-lg">
                          <Play className="w-6 h-6 text-primary group-hover:text-white ml-1" fill="currentColor" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="mb-2">
                          <span className="text-sm text-white/80">{video.date} • {video.duration}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-white/90 text-sm">
                          {video.speaker}
                        </p>
                      </div>
                    </div>
                  </Card>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="swiper-button-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <span className="sr-only">Previous</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="swiper-button-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <span className="sr-only">Next</span>
            </Button>

            {/* Custom Pagination */}
            <div className="swiper-pagination relative mt-8 text-center" />
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="group">
              View All Sermons
              <div className="ml-2 transform transition-transform group-hover:translate-x-1">→</div>
            </Button>
          </div>
        </div>
      </section>

      {/* Fullscreen Modal */}
      {fullscreenVideo && (
        <div 
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-500 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={closeFullscreen}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 w-12 h-12"
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
          >
            <X className="w-6 h-6" />
          </Button>

          <div 
            className={`w-[90vw] h-[90vh] max-w-6xl max-h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ${
              isClosing ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${fullscreenVideo}?autoplay=1&controls=1&modestbranding=1&rel=0`}
              title="Sermon video player"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          .sermon-carousel .swiper-button-prev::after,
          .sermon-carousel .swiper-button-next::after {
            content: none;
          }
          
          .sermon-carousel .swiper-pagination-bullet {
            width: 12px;
            height: 12px;
            background: hsl(var(--muted));
            opacity: 0.5;
            transition: all 0.3s ease;
          }
          
          .sermon-carousel .swiper-pagination-bullet-active {
            background: hsl(var(--primary));
            opacity: 1;
            transform: scale(1.2);
          }
          
          .sermon-carousel:hover .swiper-button-prev,
          .sermon-carousel:hover .swiper-button-next {
            opacity: 1;
          }
          
          .sermon-carousel .swiper-slide {
            width: 370px !important;
            background: transparent !important;
          }

          .sermon-carousel .swiper-slide-shadow-left,
          .sermon-carousel .swiper-slide-shadow-right,
          .sermon-carousel .swiper-slide-shadow-top,
          .sermon-carousel .swiper-slide-shadow-bottom {
            display: none !important;
            opacity: 0 !important;
          }
        `
      }} />
    </>
  );
};