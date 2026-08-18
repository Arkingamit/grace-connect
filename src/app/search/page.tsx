"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search as SearchIcon, Calendar, BookOpen, Bell, ArrowRight } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { Card } from '@/components/ui/card';

export default function SearchPage() {
  const { events, sermons, announcements } = useAdminData();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return { events: [], sermons: [], announcements: [], total: 0 };
    
    const lowerQuery = query.toLowerCase();

    const matchedEvents = events.filter(
      (e) => e.title.toLowerCase().includes(lowerQuery) || e.description?.toLowerCase().includes(lowerQuery)
    );

    const matchedSermons = sermons.filter(
      (s) => s.title.toLowerCase().includes(lowerQuery) || s.pastor.toLowerCase().includes(lowerQuery) || s.description?.toLowerCase().includes(lowerQuery)
    );

    const matchedAnnouncements = announcements.filter(
      (a) => a.title.toLowerCase().includes(lowerQuery) || a.content.toLowerCase().includes(lowerQuery)
    );

    return {
      events: matchedEvents,
      sermons: matchedSermons,
      announcements: matchedAnnouncements,
      total: matchedEvents.length + matchedSermons.length + matchedAnnouncements.length
    };
  }, [query, events, sermons, announcements]);

  return (
    <div className="min-h-screen bg-transparent pb-24">
      
      {/* Header & Search Bar */}
      <div className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#E5D5C5]/40 shadow-sm pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7A6150] shadow-sm shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]/60" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sermons, events..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border-0 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#8B2323]/20 font-medium text-[#1A202C] placeholder:text-[#7A6150]/50"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8B2323] bg-[#FBE8E8] px-2 py-0.5 rounded-md">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="px-4 pt-6 space-y-6">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-60">
            <div className="w-16 h-16 rounded-full bg-[#E5D5C5] flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-[#7A6150]" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#3A2D27]">Looking for something?</h3>
            <p className="text-sm text-[#7A6150]">Search for upcoming events, past sermons, or announcements.</p>
          </div>
        ) : results.total === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-80">
            <div className="w-16 h-16 rounded-full bg-[#FBE8E8] flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-[#8B2323]" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#3A2D27]">No results found</h3>
            <p className="text-sm text-[#7A6150]">We couldn't find anything matching "{query}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="text-xs font-bold text-[#7A6150] uppercase tracking-wider">
              Found {results.total} result{results.total === 1 ? '' : 's'}
            </p>

            {/* Events */}
            {results.events.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold font-serif text-[#1A202C] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8B2323]" /> Events
                </h3>
                {results.events.map(event => (
                  <Link key={`event-${event.id}`} href={`/events`}>
                    <Card className="p-4 border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl flex items-center gap-4 hover:bg-white transition-colors active:scale-95 duration-150">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF5F5] flex flex-col items-center justify-center shrink-0 border border-red-50">
                        <span className="text-sm font-bold text-[#8B2323] leading-none">{new Date(event.date).getDate()}</span>
                        <span className="text-[10px] font-bold text-[#8B2323] mt-0.5">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#1A202C] truncate">{event.title}</h4>
                        <p className="text-xs text-[#7A6150] truncate">{event.description || 'Join us for this event.'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8B2323] opacity-50" />
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Sermons */}
            {results.sermons.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold font-serif text-[#1A202C] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#8B2323]" /> Sermons
                </h3>
                {results.sermons.map(sermon => (
                  <Link key={`sermon-${sermon.id}`} href={`/sermons/series/${sermon.seriesId}`}>
                    <Card className="p-4 border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl flex items-center gap-4 hover:bg-white transition-colors active:scale-95 duration-150">
                      <div className="w-12 h-12 rounded-xl bg-[#F3EAE1] flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-[#8B2323]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#1A202C] truncate">{sermon.title}</h4>
                        <p className="text-xs text-[#7A6150] truncate">By {sermon.pastor}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8B2323] opacity-50" />
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Announcements */}
            {results.announcements.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold font-serif text-[#1A202C] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#8B2323]" /> Announcements
                </h3>
                {results.announcements.map(announcement => (
                  <Card key={`ann-${announcement.id}`} className="p-4 border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl">
                    <h4 className="font-bold text-sm text-[#1A202C] mb-1">{announcement.title}</h4>
                    <p className="text-sm text-[#7A6150] leading-relaxed">{announcement.content}</p>
                    <p className="text-[10px] text-[#A04A00] font-bold mt-2 uppercase tracking-wide">
                      {new Date(announcement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
