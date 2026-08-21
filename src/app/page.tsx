"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { HeroSection } from "@/components/ui/hero-section";
import { AnnouncementsSection } from "@/components/ui/announcements-section";
import { PrayerWall } from "@/components/ui/prayer-wall";
import { EventsSection } from "@/components/ui/events-section";
import { GallerySection } from "@/components/ui/gallery-section";
import { LiveStreamSection } from "@/components/ui/live-stream";
import { SongCarousel } from "@/components/ui/song-carousel";
import { CampusDetails } from "@/components/ui/campus-details";
import { SermonsPreview } from "@/components/ui/sermons-preview";
import { useParallax, useScrollReveal } from "@/lib/use-parallax";
import { MobileHomeView } from "@/components/home/mobile-home-view";
import { AuthGate } from "@/components/ui/auth-gate";
import { useAuth } from "@/lib/auth-context";
import { useAdminData } from "@/lib/admin-data-context";
import { NoteShareSection } from "@/components/ui/note-share-section";
import { MobileHomeSkeleton, DesktopHomeSkeleton } from "@/components/home/home-skeleton";

// Wrapper for parallax background sections
function ParallaxSection({
  children,
  speed = 0.3,
  className = "",
  id,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  id?: string;
}) {
  const { ref, offset } = useParallax(speed);
  return (
    <div ref={ref} id={id} className={`relative overflow-hidden ${className}`}>
      {/* Parallax background layer */}
      <div
        className="absolute inset-0 -top-20 -bottom-20 pointer-events-none"
        style={{
          transform: `translateY(${offset}px)`,
          willChange: 'transform',
        }}
      >
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Wrapper for scroll-reveal animations
function RevealSection({
  children,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const { ref, isVisible } = useScrollReveal(0.1);

  const directionStyles = {
    up: "translate-y-12",
    left: "translate-x-12",
    right: "-translate-x-12",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${isVisible
          ? "opacity-100 translate-y-0 translate-x-0"
          : `opacity-0 ${directionStyles[direction]}`
        }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const { session } = useAuth();
  const { isLoading } = useAdminData();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Show skeleton loaders while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent selection:bg-primary/10 flex flex-col">
        <MobileHomeSkeleton forceVisible={isNative} />
        {!isNative && <DesktopHomeSkeleton />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent selection:bg-primary/10 flex flex-col">
      
      {/* Phone layout, plus the native iOS/Android shell (including iPad). */}
      <MobileHomeView forceVisible={isNative} />

      {/* Desktop Original View (Hidden on Mobile and in the native app) */}
      {!isNative && (
      <div className="hidden desktop:flex flex-col">
        {session ? (
          <>

        {/* 1. Highlights (Hero) */}
        <ParallaxSection speed={0.15} className="min-h-screen flex flex-col justify-center border-b border-border/50 relative">
          <HeroSection />
        </ParallaxSection>

        {/* 2. Note Share */}
        <section id="notes" className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
          <RevealSection delay={300}>
            <div className="container mx-auto px-6">
              <NoteShareSection />
            </div>
          </RevealSection>
        </section>

        {/* 3. Prayer Wall */}
        <ParallaxSection id="prayer-wall" speed={0.25} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={100}>
            <PrayerWall />
          </RevealSection>
        </ParallaxSection>

        {/* 4. Announcements */}
        <section className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
          <RevealSection delay={300}>
            <AnnouncementsSection preview={true} />
          </RevealSection>
        </section>

        {/* 5. Events */}
        <section id="events" className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
          <RevealSection delay={50}>
            <EventsSection />
          </RevealSection>
        </section>

        {/* 6. Sermon */}
        <ParallaxSection id="sermons" speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={50}>
            <SermonsPreview />
          </RevealSection>
        </ParallaxSection>

        {/* 7. Worship Videos */}
        <section className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
          <RevealSection>
            <SongCarousel />
          </RevealSection>
        </section>

        {/* Photo Gallery */}
        <ParallaxSection id="gallery" speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={100}>
            <GallerySection />
          </RevealSection>
        </ParallaxSection>

        {/* 8. Live Worship */}
        <ParallaxSection speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={100}>
            <LiveStreamSection />
          </RevealSection>
        </ParallaxSection>

        {/* 9. Your Campus Location */}
        <section className="bg-transparent relative z-10 py-24 sm:py-32">
          <RevealSection delay={50}>
            <CampusDetails />
          </RevealSection>
        </section>

          </>
        ) : (
          <>

        {/* 1. Highlights (Hero) */}
        <ParallaxSection speed={0.15} className="min-h-screen flex flex-col justify-center border-b border-border/50 relative">
          <HeroSection />
        </ParallaxSection>

        {/* 2. Sermon */}
        <ParallaxSection speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={50}>
            <SermonsPreview />
          </RevealSection>
        </ParallaxSection>

        {/* 3. Music Videos */}
        <section className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
          <RevealSection>
            <SongCarousel />
          </RevealSection>
        </section>

        {/* 4. Live Worship */}
        <ParallaxSection speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
          <RevealSection delay={100}>
            <LiveStreamSection />
          </RevealSection>
        </ParallaxSection>

        {/* Restricted Community Features */}
        <AuthGate 
          title="Community Features" 
          description="These features are exclusive to Grace Community members. Please sign in or register to access this content."
        >
          <div className="flex flex-col">
            <section className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
              <RevealSection delay={300}>
                <AnnouncementsSection preview={true} />
              </RevealSection>
            </section>

            <section className="bg-transparent relative z-10 py-24 sm:py-32 border-b border-border/50">
              <RevealSection delay={50}>
                <EventsSection />
              </RevealSection>
            </section>

            <ParallaxSection speed={0.25} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
              <RevealSection delay={100}>
                <PrayerWall />
              </RevealSection>
            </ParallaxSection>

            <ParallaxSection speed={0.2} className="bg-transparent py-24 sm:py-32 border-b border-border/50 relative">
              <RevealSection delay={100}>
                <GallerySection />
              </RevealSection>
            </ParallaxSection>

            <section className="bg-transparent relative z-10 py-24 sm:py-32">
              <RevealSection delay={50}>
                <CampusDetails />
              </RevealSection>
            </section>
          </div>
        </AuthGate>

          </>
        )}
      </div>
      )}

    </div>
  );
}
