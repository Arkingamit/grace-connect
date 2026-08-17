"use client";

import React, { useState } from 'react';
import { useAdminData, type Sermon, type SermonSeries, hasGlobalScope, getAllowedCampuses, getAllowedGroups, getGroupsForCampus, isCoreTeamLeader, isFasLeader } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { DEFAULT_HIGHLIGHT_FIELDS, withHighlightExpiry } from '@/lib/highlight-utils';
import {
  Play,
  Plus,
  Trash2,
  Pencil,
  Youtube,
  Calendar,
  User,
  Tags,
  Search,
  FolderPlus,
  Tv,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Link,
  FileText,
  MonitorPlay,
  X,
  Megaphone,
  AlertCircle,
  Users,
} from 'lucide-react';

export default function SermonManagementPage() {
  const { 
    sermons, addSermon, updateSermon, deleteSermon, reorderSermons,
    sermonSeries, addSermonSeries, updateSermonSeries, deleteSermonSeries,
    campuses, groups, groupScopes, users, currentUser
  } = useAdminData();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('sermons');
  const [draggedSermon, setDraggedSermon] = useState<Sermon | null>(null);
  const [dragOverSermonId, setDragOverSermonId] = useState<string | null>(null);
  
  // Sermon Dialog State
  const [sermonDialogOpen, setSermonDialogOpen] = useState(false);
  const [editingSermonId, setEditingSermonId] = useState<string | null>(null);
  const [sermonFormStep, setSermonFormStep] = useState<'basics' | 'audience'>('basics');
  const [sermonForm, setSermonForm] = useState({
    title: '',
    pastor: 'Pastor Geo',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    duration: '40 min',
    seriesId: sermonSeries[0]?.id || '',
    videoId: '',
    youtubeUrl: '',
    description: '',
    isFeatured: false,
    materials: [] as {title: string; url: string; type: string}[],
    targetCampuses: ['all'] as string[],
    targetGroups: ['all'] as string[],
    excludeCampuses: [] as string[],
    excludeGroups: [] as string[],
    ...DEFAULT_HIGHLIGHT_FIELDS,
  });

  // Series Dialog State
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [seriesForm, setSeriesForm] = useState({
    title: '',
    description: '',
    category: 'Sunday Services',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'sermon' | 'series', id: string } | null>(null);
  const [campusMode, setCampusModeState] = useState<'all'|'specific'>('all');
  const [groupMode, setGroupMode] = useState<'all'|'specific'>('all');
  const isCampusLeader = currentUser?.role === 'campus_leader';
  const isGroupLeader = currentUser?.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser?.role || 'member', currentUser?.campusId);
  const isFas = isFasLeader(currentUser?.role || 'member', currentUser?.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'sermons');

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (campusLocked) return;
    setCampusModeState(mode);
    if (mode === 'all') {
      setSermonForm(f => ({ ...f, targetCampuses: ['all'] }));
    } else {
      setSermonForm(f => ({ ...f, targetCampuses: [] }));
    }
  };

  const toggleCampus = (id: string) => {
    if (campusLocked) return;
    setSermonForm(f => {
      const tc = f.targetCampuses || [];
      const has = tc.includes(id);
      const next = has ? tc.filter(c => c !== id) : [...tc.filter(c => c !== 'all'), id];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (id: string) => {
    if (campusLocked) return;
    setSermonForm(f => {
      const ec = f.excludeCampuses || [];
      const has = ec.includes(id);
      return { ...f, excludeCampuses: has ? ec.filter(c => c !== id) : [...ec, id] };
    });
  };

  const toggleGroup = (id: string) => {
    setSermonForm(f => {
      const tg = f.targetGroups || [];
      const has = tg.includes(id);
      const next = has ? tg.filter(c => c !== id) : [...tg.filter(c => c !== 'all'), id];
      if (next.length === 0) {
        return { ...f, targetGroups: isFas ? [] : (isGroupLeader ? currentUser.groups : ['all']) };
      }
      return { ...f, targetGroups: next };
    });
  };

  const setGroupModeSafe = (mode: 'all' | 'specific') => {
    if (isFas) return;
    setGroupMode(mode);
    if (mode === 'all') {
      setSermonForm(f => ({
        ...f,
        targetGroups: isGroupLeader ? currentUser.groups : ['all'],
      }));
    } else {
      setSermonForm(f => ({ ...f, targetGroups: [] }));
    }
  };

  const toggleExcludeGroup = (id: string) => {
    setSermonForm(f => {
      const eg = f.excludeGroups || [];
      const has = eg.includes(id);
      return { ...f, excludeGroups: has ? eg.filter(c => c !== id) : [...eg, id] };
    });
  };


  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSermonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(sermonForm.youtubeUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    const sermonData = {
      ...sermonForm,
      videoId,
      seriesId: sermonForm.seriesId,
    };

    // Remove youtubeUrl as it's not in the model
    const { youtubeUrl, ...finalData } = sermonData;
    const payload = withHighlightExpiry(finalData);

    if (editingSermonId !== null) {
      updateSermon(editingSermonId, payload);
    } else {
      addSermon(payload);
    }
    setSermonDialogOpen(false);
  };

  const handleSeriesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeriesId !== null) {
      updateSermonSeries(editingSeriesId, seriesForm);
    } else {
      addSermonSeries(seriesForm);
    }
    setSeriesDialogOpen(false);
  };

  const openAddSermon = () => {
    setEditingSermonId(null);
    setSermonFormStep('basics');
    setSermonForm({
      title: '',
      pastor: 'Pastor Geo',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      duration: '40 min',
      seriesId: sermonSeries[0]?.id || '',
      videoId: '',
      youtubeUrl: '',
      description: '',
      isFeatured: false,
      materials: [],
      targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
      targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
      excludeCampuses: [],
      excludeGroups: [],
      ...DEFAULT_HIGHLIGHT_FIELDS,
    });
    setCampusModeState(campusLocked ? 'specific' : 'all');
    setGroupMode(isFas || isGroupLeader ? 'specific' : 'all');
    setSermonDialogOpen(true);
  };

  const openEditSermon = (sermon: Sermon) => {
    setEditingSermonId(sermon.id);
    setSermonFormStep('basics');
    const nextGroups = isFas
      ? (sermon.targetGroups || []).includes('all')
        ? [...currentUser.groups]
        : (sermon.targetGroups || []).filter(g => g !== 'all' && currentUser.groups.includes(g))
      : (sermon.targetGroups || ['all']);
    setSermonForm({
      ...sermon,
      isFeatured: !!sermon.isFeatured,
      youtubeUrl: `https://youtube.com/watch?v=${sermon.videoId}`,
      materials: (sermon.materials || []).map(m => ({
        title: m.title,
        url: m.url,
        type: m.type || 'other'
      })),
      targetCampuses: sermon.targetCampuses || ['all'],
      targetGroups: nextGroups,
      excludeCampuses: campusLocked ? [] : (sermon.excludeCampuses || []),
      excludeGroups: sermon.excludeGroups || [],
      showOnHighlight: !!sermon.showOnHighlight,
      highlightDurationHours: sermon.highlightDurationHours || 24,
      highlightExpiresAt: sermon.highlightExpiresAt || null,
    });
    setCampusModeState((sermon.targetCampuses || []).includes('all') ? 'all' : 'specific');
    setGroupMode(isFas ? 'specific' : ((sermon.targetGroups || []).includes('all') ? 'all' : 'specific'));
    setSermonDialogOpen(true);
  };

  const openAddSeries = () => {
    setEditingSeriesId(null);
    setSeriesForm({ title: '', description: '', category: 'Sunday Services' });
    setSeriesDialogOpen(true);
  };

  const openEditSeries = (series: SermonSeries) => {
    setEditingSeriesId(series.id);
    setSeriesForm(series);
    setSeriesDialogOpen(true);
  };

  const filteredSermons = sermons.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.pastor.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSeries = sermonSeries.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  // Drag and Drop Handlers
  const handleSermonDragStart = (e: React.DragEvent, sermon: Sermon) => {
    setDraggedSermon(sermon);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSermonDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverSermonId(id);
  };

  const handleSermonDrop = (e: React.DragEvent, targetSermon: Sermon) => {
    e.preventDefault();
    setDragOverSermonId(null);
    if (!draggedSermon || draggedSermon.id === targetSermon.id) return;

    const items = [...sermons].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const draggedIdx = items.findIndex(i => i.id === draggedSermon.id);
    const targetIdx = items.findIndex(i => i.id === targetSermon.id);

    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedSermon);

    reorderSermons(items);
    setDraggedSermon(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sermon & Series Management</h1>
          <p className="text-muted-foreground mt-1">Manage playlists and individual sermon videos</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2 shrink-0">
          <Button onClick={openAddSeries} className="flex-1 sm:flex-none gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl">
            <FolderPlus className="w-4 h-4" /> New Series
          </Button>
          <Button onClick={openAddSermon} className="flex-1 sm:flex-none gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl">
            <Plus className="w-4 h-4" /> Add Sermon
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="sermons" className="gap-2">
              <Play className="w-4 h-4" /> Sermons ({sermons.length})
            </TabsTrigger>
            <TabsTrigger value="series" className="gap-2">
              <Tv className="w-4 h-4" /> Series/Playlists ({sermonSeries.length})
            </TabsTrigger>
          </TabsList>
          
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="sermons" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSermons.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((sermon) => (
              <Card 
                key={sermon.id} 
                draggable
                onDragStart={(e) => handleSermonDragStart(e, sermon)}
                onDragOver={(e) => handleSermonDragOver(e, sermon.id)}
                onDrop={(e) => handleSermonDrop(e, sermon)}
                onDragEnd={() => { setDraggedSermon(null); setDragOverSermonId(null); }}
                className={`group overflow-hidden border-2 transition-all duration-300 ${
                  dragOverSermonId === sermon.id ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-border/50 shadow-sm'
                } ${draggedSermon?.id === sermon.id ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <div className="absolute top-2 right-2 z-20 cursor-move opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/50 rounded-lg text-white">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <img 
                    src={`https://img.youtube.com/vi/${sermon.videoId}/mqdefault.jpg`}
                    alt={sermon.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => openEditSermon(sermon)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => setDeleteConfirm({ type: 'sermon', id: sermon.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {sermon.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600 border-0">
                      Featured
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {sermon.title}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" /> {sermon.pastor}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {sermon.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sermon.duration}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 h-4">
                      {sermonSeries.find(s => s.id === sermon.seriesId)?.title || 'No Series'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredSermons.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-2xl">
              <Play className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No sermons found</h3>
              <p className="text-muted-foreground mb-6">Add your first sermon to populate the dashboard</p>
              <Button onClick={openAddSermon}>Add New Sermon</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="series" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSeries.map((series) => (
              <Card key={series.id} className="border-border/50 hover:shadow-md transition-all group">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Tv className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditSeries(series)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm({ type: 'series', id: series.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{series.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{series.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">
                      {sermons.filter(s => s.seriesId === series.id).length} Sermons
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                      View Series <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredSeries.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-2xl">
              <Tv className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No series found</h3>
              <p className="text-muted-foreground mb-6">Organize your sermons by creating series</p>
              <Button onClick={openAddSeries}>Create New Series</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sermon Dialog */}
      <Dialog open={sermonDialogOpen} onOpenChange={setSermonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingSermonId ? 'Edit Sermon' : 'Add New Sermon'}
            </DialogTitle>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: Youtube },
                { id: 'audience' as const, label: 'Audience', icon: Users },
              ]).map((step, idx) => {
                const active = sermonFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'audience'] as const;
                const done = order.indexOf(sermonFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSermonFormStep(step.id)}
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
          </DialogHeader>

          <form onSubmit={handleSermonSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
              {sermonFormStep === 'basics' && (
                <div className="space-y-5 max-w-xl mx-auto">
                  <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-[#8B2323]" /> Sermon Details
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="youtubeUrl" className="text-[#3A2D27] font-semibold">YouTube URL *</Label>
                      <Input
                        id="youtubeUrl"
                        className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={sermonForm.youtubeUrl}
                        onChange={(e) => setSermonForm({ ...sermonForm, youtubeUrl: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-[#3A2D27] font-semibold">Sermon Title *</Label>
                        <Input
                          id="title"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={sermonForm.title}
                          onChange={(e) => setSermonForm({ ...sermonForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pastor" className="text-[#3A2D27] font-semibold">Pastor *</Label>
                        <Input
                          id="pastor"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={sermonForm.pastor}
                          onChange={(e) => setSermonForm({ ...sermonForm, pastor: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="series" className="text-[#3A2D27] font-semibold">Series / Playlist *</Label>
                        <select
                          id="series"
                          className="w-full h-11 px-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/60 text-sm"
                          value={sermonForm.seriesId}
                          onChange={(e) => setSermonForm({ ...sermonForm, seriesId: e.target.value })}
                          required
                        >
                          <option value="">Select a series</option>
                          {sermonSeries.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-[#3A2D27] font-semibold">Date *</Label>
                        <Input
                          id="date"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={sermonForm.date}
                          onChange={(e) => setSermonForm({ ...sermonForm, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-[#3A2D27] font-semibold">Duration</Label>
                        <Input
                          id="duration"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={sermonForm.duration}
                          onChange={(e) => setSermonForm({ ...sermonForm, duration: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-[#3A2D27] font-semibold">Short Description</Label>
                        <Input
                          id="description"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={sermonForm.description}
                          onChange={(e) => setSermonForm({ ...sermonForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/50 px-3 py-3">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={sermonForm.isFeatured}
                        onChange={(e) => setSermonForm({ ...sermonForm, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded border-[#E5D5C5] text-[#8B2323] focus:ring-[#8B2323]"
                      />
                      <Label htmlFor="featured" className="text-sm font-semibold text-[#3A2D27]">Highlight as Featured Sermon</Label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#8B2323]" /> Sermon Materials
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSermonForm({
                          ...sermonForm,
                          materials: [...sermonForm.materials, { title: '', url: '', type: 'notes' }]
                        })}
                        className="gap-1 h-8 text-xs rounded-lg border-[#E5D5C5]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Material
                      </Button>
                    </div>

                    {sermonForm.materials.length === 0 ? (
                      <div className="text-sm text-[#7A6150] text-center p-4 bg-[#FAF7F2]/50 rounded-xl border border-dashed border-[#E5D5C5]">
                        No materials attached yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sermonForm.materials.map((mat, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-[#FAF7F2]/50 p-3 rounded-xl border border-[#E5D5C5]/50">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={mat.type}
                                  onValueChange={(v) => {
                                    const newMat = [...sermonForm.materials];
                                    newMat[idx].type = v;
                                    setSermonForm({ ...sermonForm, materials: newMat });
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg bg-[#FAF7F2] border-[#E5D5C5]/60">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="notes"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Notes</div></SelectItem>
                                    <SelectItem value="presentation"><div className="flex items-center gap-2"><MonitorPlay className="w-3.5 h-3.5"/> Slides</div></SelectItem>
                                    <SelectItem value="canva"><div className="flex items-center gap-2"><MonitorPlay className="w-3.5 h-3.5"/> Canva</div></SelectItem>
                                    <SelectItem value="link"><div className="flex items-center gap-2"><Link className="w-3.5 h-3.5"/> Link</div></SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Title (e.g. Sermon Outline)"
                                  value={mat.title}
                                  onChange={(e) => {
                                    const newMat = [...sermonForm.materials];
                                    newMat[idx].title = e.target.value;
                                    setSermonForm({ ...sermonForm, materials: newMat });
                                  }}
                                  className="h-9 text-xs rounded-lg bg-[#FAF7F2] border-[#E5D5C5]/60"
                                />
                              </div>
                              <Input
                                placeholder="https://..."
                                value={mat.url}
                                onChange={(e) => {
                                  const newMat = [...sermonForm.materials];
                                  newMat[idx].url = e.target.value;
                                  setSermonForm({ ...sermonForm, materials: newMat });
                                }}
                                className="h-9 text-xs rounded-lg bg-[#FAF7F2] border-[#E5D5C5]/60"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => {
                                const newMat = [...sermonForm.materials];
                                newMat.splice(idx, 1);
                                setSermonForm({ ...sermonForm, materials: newMat });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <HighlightPublishOptions
                    showOnHighlight={sermonForm.showOnHighlight}
                    highlightDurationHours={sermonForm.highlightDurationHours}
                    onShowChange={(show) => setSermonForm({ ...sermonForm, showOnHighlight: show })}
                    onDurationChange={(hours) => setSermonForm({ ...sermonForm, highlightDurationHours: hours })}
                  />
                </div>
              )}

              {sermonFormStep === 'audience' && (
                <div className="space-y-5 max-w-xl mx-auto">
                  <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-[#1A202C]">
                      <Megaphone className="w-4 h-4 text-[#8B2323]" /> Audience Targeting
                    </h4>
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
                          {getAllowedCampuses(currentUser, campuses, 'sermons').map(c => (
                            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={(sermonForm.targetCampuses || []).includes(c.id)}
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
                              <label key={"ex-" + c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={(sermonForm.excludeCampuses || []).includes(c.id)}
                                  onCheckedChange={() => toggleExcludeCampus(c.id)}
                                />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#E5D5C5]/50">
                      <Label className="text-xs text-muted-foreground">Visible to Groups</Label>
                      {isGroupLeader && (
                        <p className="text-[10px] text-emerald-500">
                          {isCore ? 'Core Team Leader: restricted to your assigned groups' : 'FASL Leader: select from your assigned groups'}
                        </p>
                      )}
                      {!isFas && (
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={groupMode === 'all'} onCheckedChange={() => setGroupModeSafe('all')} /> All
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={groupMode === 'specific'} onCheckedChange={() => setGroupModeSafe('specific')} /> Specific
                          </label>
                        </div>
                      )}
                      {(groupMode !== 'all' || isFas) && (
                        <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                          {(() => {
                            const selectedCampusIds = campusMode === 'all' ? ['global'] : (sermonForm.targetCampuses || []);
                            const visibleGroups = campusMode === 'all'
                              ? groups
                              : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                            return getAllowedGroups(currentUser, groupScopes, 'sermons')
                              .filter(g => visibleGroups.includes(g))
                              .map(g => (
                              <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={(sermonForm.targetGroups || []).includes(g)}
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
                            const selectedCampusIds = campusMode === 'all' ? ['global'] : (sermonForm.targetCampuses || []);
                            const visibleGroups = campusMode === 'all'
                              ? groups
                              : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                            return visibleGroups.map(g => (
                              <label key={"ex-" + g} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={(sermonForm.excludeGroups || []).includes(g)}
                                  onCheckedChange={() => toggleExcludeGroup(g)}
                                  disabled={isGroupLeader && !currentUser.groups.includes(g)}
                                />
                                {g}
                              </label>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E5D5C5]/60 shrink-0 bg-[#FAF7F2]/40 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex w-full sm:w-auto items-center gap-2 order-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] flex-1 sm:flex-none min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'audience'] as const;
                    const idx = order.indexOf(sermonFormStep);
                    if (idx <= 0) setSermonDialogOpen(false);
                    else setSermonFormStep(order[idx - 1]);
                  }}
                >
                  <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                  {sermonFormStep === 'basics' ? 'Cancel' : 'Back'}
                </Button>
                {sermonFormStep !== 'audience' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      setSermonFormStep('audience');
                    }}
                  >
                    Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                  </Button>
                )}
              </div>
              <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
                {sermonFormStep !== 'audience' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      setSermonFormStep('audience');
                    }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button
                  type="submit"
                  className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                  }}
                >
                  {editingSermonId ? 'Save Changes' : 'Add Sermon'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingSeriesId ? 'Edit Series' : 'Create New Series'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSeriesSubmit} className="space-y-4 px-4 sm:px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="seriesTitle" className="text-[#3A2D27] font-semibold">Series Title *</Label>
              <Input
                id="seriesTitle"
                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seriesDescription" className="text-[#3A2D27] font-semibold">Description</Label>
              <textarea
                id="seriesDescription"
                className="w-full min-h-[100px] p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/60 text-sm"
                value={seriesForm.description}
                onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#3A2D27] font-semibold">Category *</Label>
              <Input
                id="category"
                className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                value={seriesForm.category}
                onChange={(e) => setSeriesForm({ ...seriesForm, category: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="pt-2 pb-1 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#E5D5C5] focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  setSeriesDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                }}
              >
                {editingSeriesId ? 'Save Changes' : 'Create Series'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this {deleteConfirm?.type}? This action cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteConfirm) {
                if (deleteConfirm.type === 'sermon') deleteSermon(deleteConfirm.id);
                else deleteSermonSeries(deleteConfirm.id);
              }
              setDeleteConfirm(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
