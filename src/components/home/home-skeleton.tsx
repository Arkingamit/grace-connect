"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for the mobile home view.
 * Shows shimmer placeholders for the hero card, quick actions, 
 * daily verse, events, sermons, and worship sections.
 */
export function MobileHomeSkeleton() {
  return (
    <div className="md:hidden flex flex-col min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-8">
        {/* Hero Card */}
        <Skeleton className="w-full h-[320px] rounded-[2.5rem]" />

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 px-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-14 h-14 rounded-2xl" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>
          ))}
        </div>

        {/* Daily Verse */}
        <div className="space-y-3">
          <Skeleton className="w-32 h-6 rounded" />
          <Skeleton className="w-full h-[120px] rounded-3xl" />
        </div>

        {/* Flip Cards */}
        <div className="space-y-3">
          <Skeleton className="w-40 h-6 rounded" />
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="min-w-[260px] h-[160px] rounded-3xl" />
            <Skeleton className="min-w-[260px] h-[160px] rounded-3xl" />
          </div>
        </div>

        {/* Events */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-40 h-6 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="min-w-[260px] h-[120px] rounded-3xl" />
            <Skeleton className="min-w-[260px] h-[120px] rounded-3xl" />
          </div>
        </div>

        {/* Sermons */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-32 h-6 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
          <Skeleton className="w-full h-[200px] rounded-3xl" />
        </div>

        {/* Worship */}
        <div className="space-y-3 pb-24">
          <div className="flex justify-between items-center">
            <Skeleton className="w-44 h-6 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="min-w-[180px] h-[120px] rounded-2xl" />
            <Skeleton className="min-w-[180px] h-[120px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the desktop home view.
 * Shows shimmer placeholders for the hero, sections, and content areas.
 */
export function DesktopHomeSkeleton() {
  return (
    <div className="hidden md:flex flex-col">
      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center px-8 border-b border-border/50">
        <div className="w-full max-w-4xl mx-auto space-y-8 flex flex-col items-center">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="w-[500px] h-12 rounded-xl" />
          <Skeleton className="w-[400px] h-6 rounded" />
          <Skeleton className="w-[350px] h-5 rounded" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="w-40 h-12 rounded-full" />
            <Skeleton className="w-40 h-12 rounded-full" />
          </div>
        </div>
      </div>

      {/* Sections */}
      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i} className="py-24 border-b border-border/50">
          <div className="container mx-auto px-6 space-y-8">
            <div className="space-y-3">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-64 h-10 rounded-xl" />
              <Skeleton className="w-96 h-5 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-[240px] rounded-3xl" />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
