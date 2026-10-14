"use client";

import React, { useState, useRef } from 'react';
import { useAdminData, canPublishAllCampuses, getGroupsForCampus, getAllowedCampuses, getAllowedGroups, hasGlobalScope, isCoreTeamLeader, isFasLeader, GalleryAlbum } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Search,
  Save,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  GripVertical,
  Megaphone,
  Globe,
  Building2,
  Users,
  Download,
  FileText,
  ChevronRight,
  ChevronLeft,
  Film,
  Play,
  Video,
  Clock,
  Eye,
  Calendar,
  Sparkles,
  Pencil,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveJsPdf } from '@/lib/save-image';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { CompactStackedList, mapUsersToStackedMembers } from '@/components/ui/stacked-list';
import { SendNotificationOption } from '@/components/admin/send-notification-option';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { withHighlightExpiry } from '@/lib/highlight-utils';
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/youtube';

function formatViews(views?: string | number): string {
  if (!views) return '';
  const num = typeof views === 'string' ? parseInt(views.replace(/,/g, ''), 10) : views;
  if (isNaN(num)) return String(views);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  return `${num.toLocaleString()} views`;
}

export default function GalleryManagementPage() {
  const { galleryAlbums, addGalleryAlbum, updateGalleryAlbum, deleteGalleryAlbum, reorderGalleryAlbums, campuses, groups, groupScopes, currentUser, users } = useAdminData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [albumFormStep, setAlbumFormStep] = useState<'basics' | 'audience'>('basics');
  const [uploadType, setUploadType] = useState<'album' | 'video'>('album');
  const [search, setSearch] = useState('');
  const [draggedItem, setDraggedItem] = useState<GalleryAlbum | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showBroadcastList, setShowBroadcastList] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);

  const [fetchingYoutube, setFetchingYoutube] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const youtubeFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedVideoId = useRef<string | null>(null);

  const [form, setForm] = useState<Omit<GalleryAlbum, 'id'>>({
    title: '',
    description: '',
    url: '',
    coverImage: '',
    category: 'General',
    mediaType: 'both',
    videoUrl: '',
    duration: '',
    viewCount: '',
    date: '',
    targetCampuses: ['all'],
    targetGroups: ['all'],
    excludeCampuses: [],
    excludeGroups: [],
    showOnHighlight: false,
    highlightDurationHours: 24,
    highlightExpiresAt: null,
  });

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
      setForm((prev) => ({
        ...prev,
        title: meta.title || prev.title,
        description: meta.description || prev.description,
        duration: meta.durationLabel || prev.duration,
        viewCount: meta.viewCount || prev.viewCount,
        date: meta.dateLabel || prev.date,
        coverImage: prev.coverImage || youtubeThumbnailUrl(videoId),
        videoUrl: prev.videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
        url: prev.url || `https://www.youtube.com/watch?v=${videoId}`,
      }));
    } catch (err) {
      console.error("Failed to auto-fetch video details from YouTube:", err);
    } finally {
      setFetchingYoutube(false);
    }
  };

  const handleYoutubeUrlChange = (url: string) => {
    const videoId = extractYoutubeVideoId(url);
    if (videoId !== lastFetchedVideoId.current) lastFetchedVideoId.current = null;
    setForm((prev) => ({
      ...prev,
      url,
      videoUrl: url,
      coverImage: videoId ? youtubeThumbnailUrl(videoId) : prev.coverImage,
    }));
    if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
    if (!videoId) return;
    youtubeFetchTimer.current = setTimeout(() => {
      void applyYoutubeMetadata(videoId);
    }, 350);
  };

  const categories = ['Worship', 'Youth', 'Fellowship', 'Outreach', 'Baptism', 'Group', 'Event'];

  const isCampusLeader = currentUser.role === 'campus_leader';
  const isGroupLeader = currentUser.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser.role, currentUser.campusId);
  const isFas = isFasLeader(currentUser.role, currentUser.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'gallery');

  // ── Audience helpers ──
  const campusMode = form.targetCampuses?.includes('all') ? 'all' : 'specific';
  const groupMode = isFas
    ? 'specific'
    : (form.targetGroups?.includes('all') || (isGroupLeader && form.targetGroups?.length === currentUser.groups.length && currentUser.groups.length > 0) ? 'all' : 'specific');

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (campusLocked) return;
    setForm(f => ({
      ...f,
      targetCampuses: mode === 'specific' ? [] : ['all'],
    }));
  };

  const toggleCampus = (id: string) => {
    if (campusLocked) return;
    setForm(f => {
      const tc = f.targetCampuses || [];
      const has = tc.includes(id);
      const next = has ? tc.filter(c => c !== id) : [...tc.filter(c => c !== 'all'), id];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (id: string) => {
    if (campusLocked) return;
    setForm(f => {
      const ec = f.excludeCampuses || [];
      const has = ec.includes(id);
      const next = has ? ec.filter(c => c !== id) : [...ec, id];
      return { ...f, excludeCampuses: next };
    });
  };

  const setGroupMode = (mode: 'all' | 'specific') => {
    if (isFas) return;
    setForm(f => {
      let nextTarget = ['all'];
      if (isGroupLeader) {
        nextTarget = mode === 'specific' ? [] : currentUser.groups;
      } else if (mode === 'specific') {
        nextTarget = [];
      }
      return { ...f, targetGroups: nextTarget };
    });
  };

  const toggleGroup = (g: string) => {
    setForm(f => {
      const tg = f.targetGroups || [];
      const has = tg.includes(g);
      const next = has ? tg.filter(x => x !== g) : [...tg.filter(x => x !== 'all'), g];
      if (next.length === 0) {
        return { ...f, targetGroups: isFas ? [] : (isGroupLeader ? currentUser.groups : ['all']) };
      }
      return { ...f, targetGroups: next };
    });
  };

  const toggleExcludeGroup = (g: string) => {
    setForm(f => {
      const eg = f.excludeGroups || [];
      const has = eg.includes(g);
    const next = has ? eg.filter(x => x !== g) : [...eg, g];
      return { ...f, excludeGroups: next };
    });
  };

  const handleExportPDF = (broadcastUsers: any[]) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Broadcast Audience List', 14, 22);

    const tableData = broadcastUsers.map((u) => [
      u.name,
      u.email,
      u.role,
      campuses.find((c) => c.id === u.campusId)?.name || 'Unknown',
      u.groups.join(', ') || 'None',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Name', 'Email', 'Role', 'Campus', 'Groups']],
      body: tableData,
    });

    void saveJsPdf(doc, `gallery-audience-${new Date().toISOString().slice(0, 10)}.pdf`);
    import('sonner').then(({ toast }) => toast.success('PDF exported successfully'));
  };

  const handleExportExcel = (broadcastUsers: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(
      broadcastUsers.map((u) => ({
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Campus: campuses.find((c) => c.id === u.campusId)?.name || 'Unknown',
        Groups: u.groups.join(', ') || 'None',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
    XLSX.writeFile(workbook, `gallery-audience-${new Date().toISOString().slice(0, 10)}.xlsx`);
    import('sonner').then(({ toast }) => toast.success('Excel exported successfully'));
  };

  const filteredAlbums = galleryAlbums.filter(album => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return true;
    const matchesSearch =
      Boolean(album.title && album.title.toLowerCase().includes(q)) ||
      Boolean(album.description && album.description.toLowerCase().includes(q)) ||
      Boolean(album.category && album.category.toLowerCase().includes(q));

    // Group leaders only see albums targeted at their groups
    if (isGroupLeader) {
      const aGroups = album.targetGroups ?? ['all'];
      if (!aGroups.includes('all') && !aGroups.some(g => currentUser.groups.includes(g))) {
        return false;
      }
    }
    return matchesSearch;
  });

  const resetFormState = () => {
    setIsAdding(false);
    setEditingId(null);
    setAlbumFormStep('basics');
    setSendNotification(false);
    setUploadType('album');
    lastFetchedVideoId.current = null;
    if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
    setForm({
      title: '',
      description: '',
      url: '',
      coverImage: '',
      category: 'General',
      mediaType: 'both',
      videoUrl: '',
      duration: '',
      viewCount: '',
      date: '',
      targetCampuses: ['all'],
      targetGroups: ['all'],
      excludeCampuses: [],
      excludeGroups: [],
      showOnHighlight: false,
      highlightDurationHours: 24,
      highlightExpiresAt: null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let finalForm = { ...form };

    if (uploadType === 'video' || form.mediaType === 'videos') {
      const ytUrl = (form.videoUrl || form.url || '').trim();
      const ytId = extractYoutubeVideoId(ytUrl);
      if (!ytId) {
        import('sonner').then(({ toast }) => toast.error('Please enter a valid YouTube video URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...).'));
        return;
      }
      finalForm = {
        ...form,
        url: ytUrl,
        videoUrl: ytUrl,
        mediaType: 'videos',
        coverImage: form.coverImage?.trim() || youtubeThumbnailUrl(ytId),
      };
    } else {
      if (!form.url.startsWith('https://photos.app.goo.gl/') && !form.url.startsWith('https://photos.google.com/')) {
        import('sonner').then(({ toast }) => toast.error('Please enter a valid Google Photos album URL (e.g. https://photos.app.goo.gl/...).'));
        return;
      }
    }
    
    const highlightPayload = {
      ...finalForm,
      showOnHighlight: Boolean(finalForm.showOnHighlight),
      highlightDurationHours: Number(finalForm.highlightDurationHours || 24),
    };
    const withExpiry = withHighlightExpiry(highlightPayload);

    setIsSubmitting(true);
    try {
      if (editingId !== null) {
        const ok = await updateGalleryAlbum(editingId, { ...finalForm, ...withExpiry });
        if (ok) {
          import('sonner').then(({ toast }) => toast.success('Album updated successfully!'));
          resetFormState();
        } else {
          import('sonner').then(({ toast }) => toast.error('Failed to update album. Please try again.'));
        }
      } else {
        const ok = await addGalleryAlbum({ ...finalForm, ...withExpiry, sendNotification } as Omit<GalleryAlbum, 'id'>);
        if (ok) {
          import('sonner').then(({ toast }) => toast.success('Album created successfully!'));
          resetFormState();
        } else {
          import('sonner').then(({ toast }) => toast.error('Failed to create album. Please try again.'));
        }
      }
    } catch (err) {
      console.error('Error saving gallery item:', err);
      import('sonner').then(({ toast }) => toast.error('An unexpected error occurred while saving.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (album: GalleryAlbum) => {
    const ytId = extractYoutubeVideoId(album.videoUrl || album.url);
    const isVideo = album.mediaType === 'videos' || Boolean(ytId);
    lastFetchedVideoId.current = ytId || null;
    if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
    setUploadType(isVideo ? 'video' : 'album');
    setForm({
      title: album.title,
      description: album.description,
      url: album.url,
      coverImage: album.coverImage || '',
      category: album.category || 'General',
      mediaType: album.mediaType || (isVideo ? 'videos' : 'both'),
      videoUrl: album.videoUrl || (isVideo ? album.url : ''),
      duration: album.duration || '',
      viewCount: album.viewCount || '',
      date: album.date || '',
      targetCampuses: album.targetCampuses || ['all'],
      targetGroups: isFas
        ? (album.targetGroups || []).includes('all')
          ? [...currentUser.groups]
          : (album.targetGroups || []).filter(g => g !== 'all' && currentUser.groups.includes(g))
        : (album.targetGroups || ['all']),
      excludeCampuses: campusLocked ? [] : (album.excludeCampuses || []),
      excludeGroups: album.excludeGroups || [],
      showOnHighlight: !!album.showOnHighlight,
      highlightDurationHours: album.highlightDurationHours ?? 24,
      highlightExpiresAt: album.highlightExpiresAt || null,
    });
    setEditingId(album.id);
    setAlbumFormStep('basics');
    setSendNotification(false);
    setIsAdding(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, album: GalleryAlbum) => {
    setDraggedItem(album);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetAlbum: GalleryAlbum) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedItem || draggedItem.id === targetAlbum.id) return;

    const items = [...galleryAlbums].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const draggedIdx = items.findIndex(i => i.id === draggedItem.id);
    const targetIdx = items.findIndex(i => i.id === targetAlbum.id);

    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedItem);

    reorderGalleryAlbums(items);
    setDraggedItem(null);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Gallery Management</h1>
          <p className="text-muted-foreground italic">Manage church photo albums & individual YouTube videos</p>
        </div>
        {!isAdding && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                lastFetchedVideoId.current = null;
                if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
                setForm({
                  title: '', description: '', url: '', coverImage: '', category: 'General',
                  mediaType: 'videos', videoUrl: '', duration: '', viewCount: '', date: '',
                  targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
                  targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
                  excludeCampuses: [],
                  excludeGroups: [],
                  showOnHighlight: false,
                  highlightDurationHours: 24,
                  highlightExpiresAt: null,
                });
                setUploadType('video');
                setEditingId(null);
                setAlbumFormStep('basics');
                setSendNotification(false);
                setIsAdding(true);
              }}
              className="w-full sm:w-auto rounded-full px-5 hover-lift bg-rose-700 hover:bg-rose-800 text-white shadow-sm"
            >
              <Play className="w-4 h-4 mr-2 fill-current" /> Upload YouTube Video
            </Button>
            <Button
              onClick={() => {
                lastFetchedVideoId.current = null;
                if (youtubeFetchTimer.current) clearTimeout(youtubeFetchTimer.current);
                setForm({
                  title: '', description: '', url: '', coverImage: '', category: 'General',
                  mediaType: 'both', videoUrl: '', duration: '', viewCount: '', date: '',
                  targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
                  targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
                  excludeCampuses: [],
                  excludeGroups: [],
                  showOnHighlight: false,
                  highlightDurationHours: 24,
                  highlightExpiresAt: null,
                });
                setUploadType('album');
                setEditingId(null);
                setAlbumFormStep('basics');
                setSendNotification(false);
                setIsAdding(true);
              }}
              className="w-full sm:w-auto rounded-full px-5 hover-lift bg-[#8B2323] hover:bg-[#721515] text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> New Photo Album
            </Button>
          </div>
        )}
      </div>

      {isAdding ? (
        <Card className="glass-card border-0 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <CardHeader className="border-b border-[#E5D5C5]/60 bg-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl italic">
                  {editingId 
                    ? (uploadType === 'video' ? 'Edit YouTube Video' : 'Edit Album') 
                    : (uploadType === 'video' ? 'Upload YouTube Video' : 'Create New Album')}
                </CardTitle>
                <CardDescription>
                  {uploadType === 'video'
                    ? 'Enter the YouTube video details to showcase in the church gallery'
                    : 'Enter the Google Photos album details below'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setIsAdding(false); setEditingId(null); setAlbumFormStep('basics'); }} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: uploadType === 'video' ? Play : ImageIcon },
                { id: 'audience' as const, label: 'Audience', icon: Users },
              ]).map((step, idx) => {
                const active = albumFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'audience'] as const;
                const done = order.indexOf(albumFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setAlbumFormStep(step.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 sm:px-2 py-2 sm:py-2.5 text-center transition-all border min-w-0 ${
                      active
                        ? 'bg-[#8B2323] text-white border-[#8B2323] shadow-sm'
                        : done
                          ? 'bg-[#FBE8E8] text-[#8B2323] border-[#E5C5C5]'
                          : 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]/60 hover:bg-[#F3EAE1]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide truncate w-full">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-4 sm:px-8 py-6 space-y-5">
                {/* ── Step 1: Basics ── */}
                {albumFormStep === 'basics' && (
                  <div className="space-y-5 max-w-xl mx-auto">
                    {/* Media Type Toggle Selector */}
                    {!editingId && (
                      <div className="flex items-center gap-2 p-1.5 bg-[#FAF7F2] border border-[#E5D5C5]/60 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadType('video');
                            setForm(f => ({ ...f, mediaType: 'videos', videoUrl: f.videoUrl || f.url }));
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            uploadType === 'video'
                              ? 'bg-[#8B2323] text-white shadow-sm'
                              : 'text-[#7A6150] hover:bg-white/60'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> YouTube Video
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadType('album');
                            setForm(f => ({ ...f, mediaType: f.mediaType === 'videos' ? 'both' : f.mediaType }));
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            uploadType === 'album'
                              ? 'bg-[#8B2323] text-white shadow-sm'
                              : 'text-[#7A6150] hover:bg-white/60'
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Google Photos Album
                        </button>
                      </div>
                    )}

                    <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                      <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                        {uploadType === 'video' ? (
                          <>
                            <Play className="w-4 h-4 text-[#8B2323] fill-current" /> Video Details
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 text-[#8B2323]" /> Album Details
                          </>
                        )}
                      </h3>

                      {uploadType === 'video' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="url" className="text-[#3A2D27] font-semibold">YouTube Video URL *</Label>
                            <div className="relative">
                              <Input
                                id="url"
                                value={form.videoUrl || form.url}
                                onChange={e => handleYoutubeUrlChange(e.target.value)}
                                onBlur={e => {
                                  const videoId = extractYoutubeVideoId(e.target.value);
                                  if (videoId) void applyYoutubeMetadata(videoId);
                                }}
                                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                                required
                                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pl-10"
                              />
                              <Play className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-600 fill-rose-600" />
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                              {fetchingYoutube ? (
                                <span className="text-[#8B2323] font-medium flex items-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Fetching title, duration, view count, and description from YouTube…
                                </span>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-rose-500" />
                                  <span>Supports any YouTube video link, shorts, or youtu.be share link.</span>
                                </>
                              )}
                            </p>
                          </div>

                          {/* Live YouTube Preview Card */}
                          {(() => {
                            const liveId = extractYoutubeVideoId(form.videoUrl || form.url);
                            if (!liveId) return null;
                            return (
                              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-3 flex items-center gap-3.5 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                                <div className="relative w-28 aspect-video rounded-xl overflow-hidden shrink-0 bg-black/10 border border-black/5 shadow-xs">
                                  <img 
                                    src={youtubeThumbnailUrl(liveId)} 
                                    alt="YouTube Thumbnail" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md">
                                      <Play className="w-3 h-3 fill-current ml-0.5" />
                                    </div>
                                  </div>
                                  {form.duration && (
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-semibold flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5 text-rose-400" />
                                      <span>{form.duration}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-[#1A202C] truncate">
                                      {form.title || (fetchingYoutube ? "Fetching details from YouTube..." : "YouTube Video Connected")}
                                    </p>
                                    {fetchingYoutube && <Loader2 className="w-3 h-3 animate-spin text-[#8B2323] shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-[#7A6150]">
                                    {form.duration && (
                                      <span className="flex items-center gap-1 font-medium">
                                        <Clock className="w-3 h-3 text-[#8B2323]" />
                                        {form.duration}
                                      </span>
                                    )}
                                    {form.viewCount && (
                                      <span className="flex items-center gap-1 font-medium">
                                        <Eye className="w-3 h-3 text-[#8B2323]" />
                                        {formatViews(form.viewCount)}
                                      </span>
                                    )}
                                    {form.date && (
                                      <span className="flex items-center gap-1 font-medium">
                                        <Calendar className="w-3 h-3 text-[#8B2323]" />
                                        {form.date}
                                      </span>
                                    )}
                                    {!form.duration && !form.viewCount && !fetchingYoutube && (
                                      <span className="text-[11px] text-rose-700/80">Cover thumbnail will be set automatically</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="space-y-2">
                            <Label htmlFor="title" className="text-[#3A2D27] font-semibold">Video Title *</Label>
                            <div className="relative">
                              <Input
                                id="title"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Sunday Worship Highlights"
                                required
                                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pr-9"
                              />
                              {fetchingYoutube && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#8B2323]" />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="duration" className="text-xs font-semibold text-[#3A2D27] flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#8B2323]" /> Duration
                              </Label>
                              <Input
                                id="duration"
                                value={form.duration || ''}
                                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                                placeholder="e.g. 4:32"
                                className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="viewCount" className="text-xs font-semibold text-[#3A2D27] flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-[#8B2323]" /> Views
                              </Label>
                              <Input
                                id="viewCount"
                                value={form.viewCount || ''}
                                onChange={e => setForm(f => ({ ...f, viewCount: e.target.value }))}
                                placeholder="e.g. 12,450"
                                className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                              <Label htmlFor="date" className="text-xs font-semibold text-[#3A2D27] flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#8B2323]" /> Date
                              </Label>
                              <Input
                                id="date"
                                value={form.date || ''}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                placeholder="e.g. 12 May 2024"
                                className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-[#3A2D27] font-semibold">Description (Optional)</Label>
                            <Textarea
                              id="description"
                              value={form.description || ''}
                              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Brief notes or description about this video moment..."
                              className="rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 min-h-[70px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="coverImage" className="text-[#3A2D27] font-semibold">Custom Thumbnail (Optional)</Label>
                            <Input
                              id="coverImage"
                              value={form.coverImage || ''}
                              onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                              placeholder="Leave blank to use YouTube thumbnail"
                              className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="title" className="text-[#3A2D27] font-semibold">Album Title *</Label>
                            <Input
                              id="title"
                              value={form.title}
                              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                              placeholder="e.g. Youth Camp 2024"
                              required
                              className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="url" className="text-[#3A2D27] font-semibold">Google Photos URL *</Label>
                            <div className="relative">
                              <Input
                                id="url"
                                value={form.url}
                                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                                placeholder="https://photos.app.goo.gl/..."
                                required
                                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pl-10"
                              />
                              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5 mt-1">
                              <AlertCircle className="w-3 h-3" /> Make sure the album is shared and anyone with the link can view it.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="coverImage" className="text-[#3A2D27] font-semibold">Thumbnail Image URL (Optional)</Label>
                            <div className="relative">
                              <Input
                                id="coverImage"
                                value={form.coverImage || ''}
                                onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                                placeholder="https://... (Leave blank to auto-save first photo)"
                                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pl-10"
                              />
                              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Leave blank to fetch and store the first album photo as the cover on the server.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[#3A2D27] font-semibold">Media Content Type *</Label>
                            <Select
                              value={form.mediaType || 'both'}
                              onValueChange={(val: any) => setForm(f => ({ ...f, mediaType: val }))}
                            >
                              <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">🎞️ Both (Photos & Videos)</SelectItem>
                                <SelectItem value="photos">📸 Photos Only</SelectItem>
                                <SelectItem value="videos">🎬 Videos Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="videoUrl" className="text-[#3A2D27] font-semibold">Featured Video Link (Optional YouTube / MP4)</Label>
                            <div className="relative">
                              <Input
                                id="videoUrl"
                                value={form.videoUrl || ''}
                                onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                                placeholder="https://youtube.com/watch?v=... or direct video link"
                                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 pl-10"
                              />
                              <Play className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              If this album features a specific video, add the link here to enable in-app streaming.
                            </p>
                          </div>
                        </>
                      )}

                      <HighlightPublishOptions
                        showOnHighlight={form.showOnHighlight}
                        highlightDurationHours={form.highlightDurationHours}
                        onShowChange={(show) => setForm(f => ({ ...f, showOnHighlight: show }))}
                        onDurationChange={(hours) => setForm(f => ({ ...f, highlightDurationHours: hours }))}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Audience ── */}
                {albumFormStep === 'audience' && (
              <div className="space-y-4 max-w-xl mx-auto">
                {!editingId && (
                  <SendNotificationOption
                    checked={sendNotification}
                    onChange={setSendNotification}
                    description="Members will get a push and in-app alert for these photos. Leave unchecked to publish quietly."
                  />
                )}
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" /> Audience Targeting
                </h4>
                {/* Campus */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Broadcast to Campuses</Label>
                  {isCampusLeader && (
                    <p className="text-[10px] text-amber-500">Campus Pastor: restricted to {campuses.find(c => c.id === currentUser.campusId)?.name}</p>
                  )}
                  {isFas && (
                    <p className="text-[10px] text-emerald-500">FASL Leader: restricted to {campuses.find(c => c.id === currentUser.campusId)?.name}</p>
                  )}
                  {isCore && (
                    <p className="text-[10px] text-emerald-500">Core Team Leader: all campuses, your assigned teams only</p>
                  )}
                  {canAllCampusesScope && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={campusMode === 'all'} onCheckedChange={() => setCampusMode('all')} disabled={campusLocked} /> All
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={campusMode === 'specific'} onCheckedChange={() => setCampusMode('specific')} disabled={campusLocked} /> Specific
                      </label>
                    </div>
                  )}
                  {(campusMode !== 'all' || !canAllCampusesScope) && (
                    <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                      {getAllowedCampuses(currentUser, campuses, 'gallery').map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={(form.targetCampuses || []).includes(c.id)}
                            onCheckedChange={() => toggleCampus(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  )}

                  {!campusLocked && (
                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground">Exclude Campuses (Optional)</Label>
                      <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                        {campuses.map(c => (
                          <label key={`ex-${c.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={(form.excludeCampuses || []).includes(c.id)}
                              onCheckedChange={() => toggleExcludeCampus(c.id)}
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Groups */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-muted-foreground">Visible to Groups</Label>
                  {isGroupLeader && (
                    <p className="text-[10px] text-emerald-500">
                      {isCore ? 'Core Team Leader: restricted to your assigned groups' : 'FASL Leader: select from your assigned groups'}
                    </p>
                  )}
                  {!isFas && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={groupMode === 'all'} onCheckedChange={() => setGroupMode('all')} /> All
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={groupMode === 'specific'} onCheckedChange={() => setGroupMode('specific')} /> Specific
                      </label>
                    </div>
                  )}
                  {(groupMode !== 'all' || isFas) && (
                    <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                      {(() => {
                        // Filter groups based on selected campuses
                        const selectedCampusIds = campusMode === 'all' ? ['global'] : (form.targetCampuses || []);
                        const visibleGroups = campusMode === 'all'
                          ? groups
                          : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                        return getAllowedGroups(currentUser, groupScopes, 'gallery')
                          .filter(g => visibleGroups.includes(g))
                          .map(g => (
                          <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox 
                              checked={(form.targetGroups || []).includes(g)} 
                              onCheckedChange={() => toggleGroup(g)} 
                            />
                            {g}
                          </label>
                        ));
                      })()}
                    </div>
                  )}

                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Exclude Groups (Optional)</Label>
                    <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                      {(() => {
                        // Filter groups based on selected campuses
                        const selectedCampusIds = campusMode === 'all' ? ['global'] : (form.targetCampuses || []);
                        const visibleGroups = campusMode === 'all'
                          ? groups
                          : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                        return visibleGroups.map(g => (
                          <label key={`ex-${g}`} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox 
                              checked={(form.excludeGroups || []).includes(g as string)} 
                              onCheckedChange={() => toggleExcludeGroup(g as string)} 
                              disabled={isGroupLeader && !currentUser.groups.includes(g as string)}
                            />
                            {g as string}
                          </label>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Audience Preview</p>
                  <p className="text-xs">
                    {campusMode === 'all' ? '🌐 All Campuses' : `🏢 ${(form.targetCampuses || []).map(id => campuses.find(c => c.id === id)?.name || id).join(', ') || 'None'}`}
                    {(form.excludeCampuses || []).length > 0 && ` (excluding: ${(form.excludeCampuses || []).map(id => campuses.find(c => c.id === id)?.name || id).join(', ')})`}
                    {' · '}
                    {groupMode === 'all' && !isFas ? '👥 All Groups' : `👤 ${(form.targetGroups || []).join(', ') || 'None'}`}
                    {(form.excludeGroups || []).length > 0 && ` (excluding: ${(form.excludeGroups || []).join(', ')})`}
                  </p>
                  {(() => {
                    const broadcastUsers = users.filter(u => {
                      if ((form.excludeCampuses || []).includes(u.campusId)) return false;
                      const tc = form.targetCampuses || [];
                      const campusMatch = tc.includes('all') || tc.includes(u.campusId);
                      if (!campusMatch) return false;
                      if (u.groups.some(g => (form.excludeGroups || []).includes(g))) return false;
                      const tg = form.targetGroups || [];
                      const groupMatch = tg.includes('all') || tg.some(g => u.groups.includes(g));
                      return groupMatch;
                    });
                    return (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0">
                            Broadcast List ({broadcastUsers.length} members)
                          </p>
                          {broadcastUsers.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleExportExcel(broadcastUsers);
                                }}
                                className="h-6 text-[10px] px-2 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Download className="w-3 h-3" /> Excel
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleExportPDF(broadcastUsers);
                                }}
                                className="h-6 text-[10px] px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <FileText className="w-3 h-3" /> PDF
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLButtonElement).blur();
                                  setShowBroadcastList(!showBroadcastList);
                                }}
                                className="h-6 text-[10px] px-2 text-[#8B2323] border-[#E5C5C5] hover:bg-[#FBE8E8] hover:text-[#8B2323] focus-visible:ring-0 focus-visible:ring-offset-0"
                              >
                                {showBroadcastList ? 'Hide Members' : 'Show Members'}
                              </Button>
                            </div>
                          )}
                        </div>
                        {showBroadcastList && broadcastUsers.length > 0 && (
                          <CompactStackedList
                            members={mapUsersToStackedMembers(
                              broadcastUsers.map((u) => ({
                                id: u.id,
                                name: u.name,
                                role: u.role,
                                campusId: u.campusId,
                                campusName:
                                  campuses.find((c) => c.id === u.campusId)?.name ||
                                  'Unknown Campus',
                              })),
                            )}
                          />
                        )}
                        {!showBroadcastList && broadcastUsers.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            No members will receive this broadcast
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
                )}
              </div>

              <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-[#E5D5C5]/60 bg-[#FAF7F2]/40 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex w-full sm:w-auto items-center gap-2 order-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-[#E5D5C5] flex-1 sm:flex-none min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      const order = ['basics', 'audience'] as const;
                      const idx = order.indexOf(albumFormStep);
                      if (idx <= 0) {
                        setIsAdding(false);
                        setEditingId(null);
                        setAlbumFormStep('basics');
                      } else {
                        setAlbumFormStep(order[idx - 1]);
                      }
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                    {albumFormStep === 'basics' ? 'Cancel' : 'Back'}
                  </Button>
                  {albumFormStep !== 'audience' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={(e) => {
                        (e.currentTarget as HTMLButtonElement).blur();
                        setAlbumFormStep('audience');
                      }}
                    >
                      Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                    </Button>
                  )}
                </div>
                <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
                  {albumFormStep !== 'audience' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={(e) => {
                        (e.currentTarget as HTMLButtonElement).blur();
                        setAlbumFormStep('audience');
                      }}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {editingId ? 'Updating Album...' : 'Creating Album...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Album' : 'Create Album'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex justify-end">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search albums..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlbums.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((album) => (
              <Card 
                key={album.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, album)}
                onDragOver={(e) => handleDragOver(e, album.id)}
                onDrop={(e) => handleDrop(e, album)}
                onDragEnd={() => { setDraggedItem(null); setDragOverId(null); }}
                className={`glass-card border-2 overflow-hidden flex flex-col hover-lift group transition-all duration-500 ${
                  dragOverId === album.id ? 'border-primary scale-[1.02] shadow-xl' : 'border-transparent'
                } ${draggedItem?.id === album.id ? 'opacity-40 animate-pulse' : 'opacity-100'}`}
              >
                <div className="aspect-video relative bg-primary/5 flex items-center justify-center overflow-hidden">
                  <div className="absolute top-4 right-4 z-20 cursor-move opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-black/50 rounded-lg text-white">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  {(() => {
                    const cover = album.coverImage || (extractYoutubeVideoId(album.videoUrl || album.url) ? youtubeThumbnailUrl(extractYoutubeVideoId(album.videoUrl || album.url)!) : null);
                    if (cover) {
                      return (
                        <img 
                          src={cover} 
                          alt={album.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      );
                    }
                    return <ImageIcon className="w-12 h-12 text-primary/10 group-hover:scale-125 transition-transform duration-700" />;
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {album.mediaType === 'videos' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {album.duration && (
                    <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                      <Clock className="w-2.5 h-2.5 text-rose-400" />
                      <span>{album.duration}</span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-1 italic">{album.title}</h3>
                  </div>
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">


                  {/* Audience & Media Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {album.mediaType === 'videos' ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-rose-500/30 text-rose-600 bg-rose-50/50">
                        <Play className="w-2.5 h-2.5 fill-current" /> Videos
                      </Badge>
                    ) : album.mediaType === 'photos' ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-blue-500/30 text-blue-600 bg-blue-50/50">
                        <ImageIcon className="w-2.5 h-2.5" /> Photos
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] gap-1 border-purple-500/30 text-purple-600 bg-purple-50/50">
                        <Film className="w-2.5 h-2.5" /> Photos & Videos
                      </Badge>
                    )}
                    {album.viewCount && (
                      <Badge variant="outline" className="text-[9px] gap-1 border-stone-400/40 text-stone-700 bg-stone-100/70">
                        <Eye className="w-2.5 h-2.5" /> {formatViews(album.viewCount)}
                      </Badge>
                    )}
                    {album.date && (
                      <Badge variant="outline" className="text-[9px] gap-1 border-stone-400/40 text-stone-700 bg-stone-100/70">
                        <Calendar className="w-2.5 h-2.5" /> {album.date}
                      </Badge>
                    )}
                    {(album.targetCampuses ?? ['all']).includes('all') ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/30 text-amber-600">
                        <Globe className="w-2.5 h-2.5" /> All Campuses
                      </Badge>
                    ) : (
                      album.targetCampuses?.map(id => (
                        <Badge key={id} variant="outline" className="text-[9px] gap-1 border-blue-500/30 text-blue-600">
                          <Building2 className="w-2.5 h-2.5" /> {campuses.find(c => c.id === id)?.name || id}
                        </Badge>
                      ))
                    )}
                    {(album.targetGroups ?? ['all']).includes('all') ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-emerald-500/30 text-emerald-600">
                        <Users className="w-2.5 h-2.5" /> All Groups
                      </Badge>
                    ) : (
                      album.targetGroups?.map(g => (
                        <Badge key={g} variant="outline" className="text-[9px] gap-1 border-purple-500/30 text-purple-600">
                          <Users className="w-2.5 h-2.5" /> {g}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button
                        variant="glass"
                        size="icon"
                        title="Edit Album"
                        className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => handleEdit(album)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="glass"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => deleteGalleryAlbum(album.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <a href={album.videoUrl || album.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-9 group/btn px-2 hover:bg-transparent text-primary">
                        {album.mediaType === 'videos' ? 'Watch' : 'Link'} <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredAlbums.length === 0 && (
              <div className="col-span-full text-center py-24 glass-card rounded-3xl border-0">
                <ImageIcon className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-2 italic">No Albums Found</h3>
                <p className="text-muted-foreground mb-8">Ready to showcase your community moments?</p>
                <Button variant="outline" onClick={() => {
                  setForm({
                    title: '', description: '', url: '', coverImage: '', category: 'Worship',
                    targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
                    targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
                    excludeCampuses: [],
                    excludeGroups: [],
                  });
                  setEditingId(null);
                  setAlbumFormStep('basics');
                  setSendNotification(false);
                  setIsAdding(true);
                }} className="rounded-full px-8">
                  Add Your First Album
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
