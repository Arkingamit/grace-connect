"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Megaphone,
  Users,
  ArrowRight,
  Clock,
  TrendingUp,
  Building2,
  Shield,
  Image as ImageIcon,
  Music,
  Play,
  Radio,
  QrCode,
  Droplet,
  Heart,
  Plus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bell,
  Video,
  Edit,
  Mail,
  PlusCircle
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { 
    events, announcements, users, campuses, currentUser, 
    worshipVideos, sermons, sermonSeries, galleryAlbums, 
    liveStreams, prayerRequests 
  } = useAdminData();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const sermonsScrollRef = useRef<HTMLDivElement>(null);

  // Close FAB menu when clicking outside
  useEffect(() => {
    const handleClick = () => setFabOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now);
  const totalRegistered = events.reduce((sum, e) => sum + e.registered, 0);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isCampusLeader = currentUser.role === 'campus_leader' || isAdmin;
  const isGroupLeader = currentUser.role === 'group_leader' || isCampusLeader;

  // Stats for the mobile view (original styling)
  const statsMobile = [
    {
      label: 'Total Events',
      value: events.length,
      icon: Calendar,
      color: 'text-[#8B2323]',
      bg: 'bg-[#FFF5F5]',
    },
    {
      label: 'Upcoming',
      value: upcomingEvents.length,
      icon: Clock,
      color: 'text-[#8B2323]',
      bg: 'bg-[#FFF5F5]',
    },
    {
      label: 'Announcements',
      value: announcements.length,
      icon: Megaphone,
      color: 'text-[#8B2323]',
      bg: 'bg-[#FFF5F5]',
    },
    {
      label: 'Total RSVPs',
      value: totalRegistered,
      icon: TrendingUp,
      color: 'text-[#8B2323]',
      bg: 'bg-[#FFF5F5]',
    },
  ];

  // Stats for the desktop view (redesigned styling)
  const statsDesktop = [
    {
      label: 'Total Events',
      value: events.length,
      icon: Calendar,
      bg: 'bg-[#FFF5F5] text-[#8B2323]',
    },
    {
      label: 'Upcoming (7 Days)',
      value: events.filter(e => {
        const d = new Date(e.date);
        const diff = d.getTime() - now.getTime();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }).length,
      icon: Clock,
      bg: 'bg-[#FFF5F5] text-[#8B2323]',
    },
    {
      label: 'New Announcements',
      value: announcements.filter(a => {
        const d = new Date(a.createdAt);
        const diff = now.getTime() - d.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }).length,
      icon: Megaphone,
      bg: 'bg-[#FFF5F5] text-[#8B2323]',
    },
    {
      label: 'Total RSVPs',
      value: totalRegistered,
      icon: TrendingUp,
      bg: 'bg-[#FFF5F5] text-[#8B2323]',
    },
  ];

  // Map series ID to its title
  const seriesMap = new Map(sermonSeries.map(s => [s.id, s.title]));

  // Build unified Recent Activity list
  const activityItems: Array<{
    type: 'EVENT' | 'NEWS' | 'PRAYER' | 'MEDIA';
    title: string;
    timestamp: Date;
    rawTime: string;
    badge: string;
    icon: React.ElementType;
    iconColor: string;
    badgeStyle: string;
  }> = [];

  // 1. Events
  events.forEach(e => {
    activityItems.push({
      type: 'EVENT',
      title: e.title,
      timestamp: new Date(e.createdAt || e.date),
      rawTime: e.createdAt || e.date,
      badge: 'EVENT',
      icon: Calendar,
      iconColor: 'text-[#8B2323] bg-[#FFF5F5] border border-[#EBE3D5]',
      badgeStyle: 'text-[#8B2323] bg-[#FFF5F5] border-[#EBE3D5]'
    });
  });

  // 2. Announcements
  announcements.forEach(a => {
    activityItems.push({
      type: 'NEWS',
      title: a.title,
      timestamp: new Date(a.createdAt),
      rawTime: a.createdAt,
      badge: 'NEWS',
      icon: Bell,
      iconColor: 'text-[#8B2323] bg-[#FFF5F5] border border-[#EBE3D5]',
      badgeStyle: 'text-[#8B2323] bg-[#FFF5F5] border-[#EBE3D5]'
    });
  });

  // 3. Prayers
  prayerRequests.forEach(p => {
    activityItems.push({
      type: 'PRAYER',
      title: p.isAnonymous ? 'Anonymous Prayer Request' : `Prayer request from ${p.authorName}`,
      timestamp: new Date(p.createdAt),
      rawTime: p.createdAt,
      badge: 'PRAYER',
      icon: Droplet,
      iconColor: 'text-[#8B2323] bg-[#FFF5F5] border border-[#EBE3D5]',
      badgeStyle: 'text-[#8B2323] bg-[#FFF5F5] border-[#EBE3D5]'
    });
  });

  // 4. Media (Sermons)
  sermons.forEach(s => {
    activityItems.push({
      type: 'MEDIA',
      title: s.title,
      timestamp: new Date(s.date),
      rawTime: s.date,
      badge: 'MEDIA',
      icon: Video,
      iconColor: 'text-[#8B2323] bg-[#FFF5F5] border border-[#EBE3D5]',
      badgeStyle: 'text-[#8B2323] bg-[#FFF5F5] border-[#EBE3D5]'
    });
  });

  // Sort activities: most recent first
  const sortedActivitiesMobile = [...activityItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 6);

  const sortedActivitiesDesktop = [...activityItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 4);

  // Time formatter matching the mockup rules
  function formatActivityTime(dateInput: Date | string, type: string) {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
                    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                        date.getMonth() === yesterday.getMonth() && 
                        date.getFullYear() === yesterday.getFullYear();

    if (type === 'EVENT') {
      if (isToday) {
        return `Today · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      if (isYesterday) {
        return `Yesterday · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    if (Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
      if (diffMs > 0) {
        if (diffMins < 60) {
          return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
        }
        return `${diffHours} hours ago`;
      }
    }

    if (isYesterday) {
      return `Yesterday · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  // Scroll handler for Recent Sermons
  const handleScroll = () => {
    const container = sermonsScrollRef.current;
    if (container) {
      const totalScroll = container.scrollWidth - container.clientWidth;
      if (totalScroll > 0) {
        setScrollProgress((container.scrollLeft / totalScroll) * 100);
      }
    }
  };

  const scrollSermons = (direction: 'left' | 'right') => {
    const container = sermonsScrollRef.current;
    if (container) {
      const scrollAmount = 240;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE VIEW (RESTORED ORIGINAL LAYOUT WITHOUT SCROLLBAR)        */}
      {/* ============================================================== */}
      <div className="md:hidden space-y-8 pb-16 relative">
        {/* Welcome Header */}
        <div className="rounded-3xl bg-gradient-to-br from-[#8B2323] to-[#5C1111] p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Good morning</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Welcome back,<br/>{currentUser.name.split(' ')[0]}</h2>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live Sync Active
              </Badge>
            </div>
            <p className="text-white/70 text-xs pt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {upcomingEvents.length} events upcoming
            </p>
          </div>
        </div>

        {/* Section: Overview */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Overview</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {statsMobile.map((stat, idx) => (
              <Card key={idx} className="border-border/40 bg-card/60 shadow-sm hover:shadow transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isCampusLeader && (
            <Card className="border border-[#EBE3D5] bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#3A2D27]">Worship Homepage</h3>
                    <Music className="w-5 h-5 text-[#8B2323]" />
                  </div>
                  <p className="text-xs text-[#7A6150] leading-relaxed">
                    Manage video items that appear on the homepage carousel.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/admin/worship" className="inline-flex items-center text-xs font-bold text-[#8B2323] hover:text-[#5C1111] transition-colors">
                    Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isCampusLeader && (
            <Card className="border border-[#EBE3D5] bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#3A2D27]">Campus Broadcasts</h3>
                    <Radio className="w-5 h-5 text-[#8B2323]" />
                  </div>
                  <p className="text-xs text-[#7A6150] leading-relaxed">
                    Configure live worship feeds and stream settings.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/admin/live" className="inline-flex items-center text-xs font-bold text-[#8B2323] hover:text-[#5C1111] transition-colors">
                    Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className="border border-[#EBE3D5] bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#3A2D27]">Gallery Config</h3>
                    <ImageIcon className="w-5 h-5 text-[#8B2323]" />
                  </div>
                  <p className="text-xs text-[#7A6150] leading-relaxed">
                    Organize event photos and media albums.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/admin/gallery" className="inline-flex items-center text-xs font-bold text-[#8B2323] hover:text-[#5C1111] transition-colors">
                    Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className="border border-[#EBE3D5] bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#3A2D27]">Daily Verses</h3>
                    <BookOpen className="w-5 h-5 text-[#8B2323]" />
                  </div>
                  <p className="text-xs text-[#7A6150] leading-relaxed">
                    Curate and schedule scriptural verses.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/admin/verses" className="inline-flex items-center text-xs font-bold text-[#8B2323] hover:text-[#5C1111] transition-colors">
                    Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions Buttons */}
        {isCampusLeader && (
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/qr-codes" className="block">
              <div className="flex items-center justify-center gap-3 p-4 bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-all duration-300 rounded-2xl shadow-sm text-center cursor-pointer group">
                <QrCode className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-bold text-sm text-rose-950">QR Codes</span>
              </div>
            </Link>
            
            <Link href="/admin/users" className="block">
              <div className="flex items-center justify-center gap-3 p-4 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all duration-300 rounded-2xl shadow-sm text-center cursor-pointer group">
                <Users className="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-bold text-sm text-slate-900">Users</span>
              </div>
            </Link>
          </div>
        )}

        {/* Recent Sermons Carousel */}
        {isAdmin && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Recent Sermons</h2>
            
            {sermons.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/50">
                No sermons found. Link sermons to YouTube in sermon configuration.
              </div>
            ) : (
              <div className="relative">
                <div 
                  ref={sermonsScrollRef} 
                  className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {sermons.map((sermon) => {
                    const seriesTitle = seriesMap.get(sermon.seriesId) || 'Series 1';
                    return (
                      <Link key={sermon.id} href="/admin/sermons" className="min-w-[160px] w-[160px] shrink-0 group block">
                        <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
                          <img 
                            src={`https://img.youtube.com/vi/${sermon.videoId}/hqdefault.jpg`} 
                            alt={sermon.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                          {sermon.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{seriesTitle}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</h2>
            <Link href="/admin/announcements" className="text-xs font-bold text-red-700 hover:text-red-800 transition-colors">
              View all
            </Link>
          </div>

          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {sortedActivitiesMobile.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {sortedActivitiesMobile.map((activity, idx) => {
                    const ActivityIcon = activity.icon;
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.iconColor}`}>
                            <ActivityIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{activity.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatActivityTime(activity.rawTime, activity.type)}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase shrink-0 ml-3 border ${activity.badgeStyle}`}
                        >
                          {activity.badge}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (NEW REDESIGNED BENTO LAYOUT)                     */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-8 pb-16">
        {/* 1. Hero Section */}
        <div className="flex justify-between items-end border-b border-border/50 pb-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary dark:text-[#ffb4ab]">Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Welcome back. Here is your church management summary.</p>
          </div>
          <div className="flex items-center gap-2 bg-card p-3 rounded-2xl border border-border shadow-[0_4px_24px_rgba(47,60,94,0.04)]">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* 2. Analytics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsDesktop.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <Card key={idx} className="bg-card p-6 rounded-2xl shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60 flex items-center justify-between transition-all hover:-translate-y-1 duration-300">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* 3. Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Wide) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Recent Sermons */}
            <Card className="bg-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-primary dark:text-[#ffb4ab]">Recent Sermons</h3>
                <Link href="/admin/sermons">
                  <Button variant="ghost" size="sm" className="text-[#805600] font-semibold hover:underline bg-transparent hover:bg-transparent">
                    View All
                  </Button>
                </Link>
              </div>
              
              {sermons.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  No sermons configured. Create one in the sermons section.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sermons.slice(0, 2).map((sermon) => (
                    <div key={sermon.id} className="group relative rounded-2xl overflow-hidden border border-border/60 bg-card hover:shadow-md transition-all duration-300">
                      <div className="aspect-video bg-muted relative">
                        <img 
                          className="w-full h-full object-cover" 
                          src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`} 
                          alt={sermon.title} 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href="/admin/sermons">
                            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-lg hover:scale-105 active:scale-95 transition-transform">
                              <Edit className="w-4 h-4 text-primary" />
                            </button>
                          </Link>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm text-foreground truncate">{sermon.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {seriesMap.get(sermon.seriesId) || 'Foundations'} • {new Date(sermon.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Photo Galleries Bento */}
            <Card className="bg-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-primary dark:text-[#ffb4ab]">Photo Galleries</h3>
                <Link href="/admin/gallery">
                  <Button variant="ghost" size="sm" className="text-[#805600] font-semibold hover:underline bg-transparent hover:bg-transparent">
                    Manage All
                  </Button>
                </Link>
              </div>

              {galleryAlbums.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  No galleries created yet. Create albums in the gallery section.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Large Gallery Card */}
                  {galleryAlbums[0] && (
                    <Link href="/admin/gallery" className="md:col-span-2 relative rounded-2xl overflow-hidden h-48 group cursor-pointer block shadow-sm hover:shadow-md transition-shadow">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        src={galleryAlbums[0].coverImage || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80"} 
                        alt={galleryAlbums[0].title} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                        <h4 className="text-base font-bold text-white mb-1">{galleryAlbums[0].title}</h4>
                        <p className="text-xs text-white/70">{galleryAlbums[0].category || 'Campus Life'} • Updated Recently</p>
                      </div>
                    </Link>
                  )}

                  {/* Smaller Gallery Card */}
                  {galleryAlbums[1] ? (
                    <Link href="/admin/gallery" className="relative rounded-2xl overflow-hidden h-48 group cursor-pointer block shadow-sm hover:shadow-md transition-shadow">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        src={galleryAlbums[1].coverImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80"} 
                        alt={galleryAlbums[1].title} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                        <h4 className="text-sm font-bold text-white mb-1">{galleryAlbums[1].title}</h4>
                        <p className="text-xs text-white/70">{galleryAlbums[1].category || 'Outreach'}</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-muted/50 rounded-2xl h-48 border border-dashed border-border/80 flex flex-col items-center justify-center p-4 text-center text-muted-foreground text-xs">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      No second album. Add one to complete the grid!
                    </div>
                  )}

                </div>
              )}
            </Card>

            {/* Content Configuration (Desktop equivalent of mobile options) */}
            <Card className="bg-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60">
              <h3 className="text-lg font-serif font-bold text-primary dark:text-[#ffb4ab] mb-4">Content Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {isCampusLeader && (
                  <Link href="/admin/worship" className="block group">
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/40 transition-colors h-full flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Music className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Worship Homepage</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Manage video items that appear on the homepage carousel.</p>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-primary">
                        Manage <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )}

                {isCampusLeader && (
                  <Link href="/admin/live" className="block group">
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/40 transition-colors h-full flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Radio className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Campus Broadcasts</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Configure live worship feeds and stream settings.</p>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-primary">
                        Manage <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )}

                {isAdmin && (
                  <Link href="/admin/gallery" className="block group">
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/40 transition-colors h-full flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Gallery Config</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Organize event photos and media albums.</p>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-primary">
                        Manage <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )}

                {isAdmin && (
                  <Link href="/admin/verses" className="block group">
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/40 transition-colors h-full flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Daily Verses</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">Curate and schedule scriptural verses.</p>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-primary">
                        Manage <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )}

              </div>
            </Card>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="flex flex-col gap-6">
            
            {/* Quick Actions */}
            <Card className="bg-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60">
              <h3 className="text-lg font-serif font-bold text-primary dark:text-[#ffb4ab] mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-3">
                <Link href="/admin/events">
                  <button className="flex items-center gap-3 w-full p-3.5 rounded-2xl border border-border/80 hover:border-primary/50 hover:bg-muted/50 transition-all text-left group">
                    <span className="w-8 h-8 rounded-xl bg-[#FFF5F5] text-[#8B2323] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <PlusCircle className="w-5 h-5" />
                    </span>
                    <span className="font-semibold text-sm text-foreground">Create Event</span>
                  </button>
                </Link>
                
                <Link href="/admin/announcements">
                  <button className="flex items-center gap-3 w-full p-3.5 rounded-2xl border border-border/80 hover:border-secondary/50 hover:bg-muted/50 transition-all text-left group">
                    <span className="w-8 h-8 rounded-xl bg-[#FFF5F5] text-[#8B2323] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <span className="font-semibold text-sm text-foreground">Post Announcement</span>
                  </button>
                </Link>

                <Link href="/admin/users">
                  <button className="flex items-center gap-3 w-full p-3.5 rounded-2xl border border-border/80 hover:border-tertiary/50 hover:bg-muted/50 transition-all text-left group">
                    <span className="w-8 h-8 rounded-xl bg-[#FFF5F5] text-[#8B2323] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </span>
                    <span className="font-semibold text-sm text-foreground">Manage Members</span>
                  </button>
                </Link>
              </div>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="bg-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(47,60,94,0.04)] border border-border/60 flex-grow">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-bold text-primary dark:text-[#ffb4ab]">Recent Activity</h3>
              </div>
              
              {sortedActivitiesDesktop.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No recent activity logged.
                </div>
              ) : (
                <div className="relative pl-4 border-l border-border/80 flex flex-col gap-6">
                  {sortedActivitiesDesktop.map((activity, idx) => {
                    const ActivityIcon = activity.icon;
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-card flex items-center justify-center bg-[#8B2323]`} />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase tracking-wider border ${activity.badgeStyle}`}>
                              {activity.badge}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatActivityTime(activity.rawTime, activity.type)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {activity.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

          </div>

        </div>
      </div>

      {/* Floating Action Button (FAB) & Menu */}
      {isGroupLeader && (
        <div 
          className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {fabOpen && (
            <div className="bg-popover border border-border/60 shadow-2xl rounded-2xl p-2 w-48 mb-2 flex flex-col gap-1 animate-in slide-in-from-bottom-5 fade-in duration-200">
              <Link href="/admin/announcements" onClick={() => setFabOpen(false)}>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Megaphone className="w-4 h-4 text-[#8B2323]" />
                  <span>Post News</span>
                </div>
              </Link>
              <Link href="/admin/events" onClick={() => setFabOpen(false)}>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Calendar className="w-4 h-4 text-[#8B2323]" />
                  <span>Create Event</span>
                </div>
              </Link>
              {isAdmin && (
                <Link href="/admin/sermons" onClick={() => setFabOpen(false)}>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <Play className="w-4 h-4 text-[#8B2323]" />
                    <span>Add Sermon</span>
                  </div>
                </Link>
              )}
              <Link href="/admin/prayers" onClick={() => setFabOpen(false)}>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Heart className="w-4 h-4 text-[#8B2323]" />
                  <span>Prayer Request</span>
                </div>
              </Link>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFabOpen(!fabOpen);
            }}
            className={`w-14 h-14 rounded-full bg-red-800 hover:bg-red-900 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform ${fabOpen ? 'rotate-45 bg-red-900' : ''}`}
            aria-label="Quick Actions"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}
