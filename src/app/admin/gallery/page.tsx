"use client";

import React, { useState } from 'react';
import { useAdminData, canPublishAllCampuses, getGroupsForCampus, getAllowedCampuses, getAllowedGroups, hasGlobalScope, GalleryAlbum } from '@/lib/admin-data-context';
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
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';

export default function GalleryManagementPage() {
  const { galleryAlbums, addGalleryAlbum, updateGalleryAlbum, deleteGalleryAlbum, reorderGalleryAlbums, campuses, groups, groupScopes, currentUser, users } = useAdminData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draggedItem, setDraggedItem] = useState<GalleryAlbum | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showBroadcastList, setShowBroadcastList] = useState(false);

  const [form, setForm] = useState<Omit<GalleryAlbum, 'id'>>({
    title: '',
    description: '',
    url: '',
    coverImage: '',
    category: 'Worship',
    targetCampuses: ['all'],
    targetGroups: ['all'],
    excludeCampuses: [],
    excludeGroups: [],
  });

  const categories = ['Worship', 'Youth', 'Fellowship', 'Outreach', 'Baptism', 'Group', 'Event'];

  const isCampusLeader = currentUser.role === 'campus_leader';
  const isGroupLeader = currentUser.role === 'group_leader';

  // ── Audience helpers ──
  const campusMode = form.targetCampuses?.includes('all') ? 'all' : 'specific';
  const groupMode = form.targetGroups?.includes('all') || (isGroupLeader && form.targetGroups?.length === currentUser.groups.length && currentUser.groups.length > 0) ? 'all' : 'specific';

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (isCampusLeader || isGroupLeader) return;
    setForm(f => ({
      ...f,
      targetCampuses: mode === 'specific' ? [] : ['all'],
    }));
  };

  const toggleCampus = (id: string) => {
    if (isCampusLeader || isGroupLeader) return;
    setForm(f => {
      const tc = f.targetCampuses || [];
      const has = tc.includes(id);
      const next = has ? tc.filter(c => c !== id) : [...tc.filter(c => c !== 'all'), id];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (id: string) => {
    if (isCampusLeader || isGroupLeader) return;
    setForm(f => {
      const ec = f.excludeCampuses || [];
      const has = ec.includes(id);
      const next = has ? ec.filter(c => c !== id) : [...ec, id];
      return { ...f, excludeCampuses: next };
    });
  };

  const setGroupMode = (mode: 'all' | 'specific') => {
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
      return { ...f, targetGroups: next.length === 0 ? (isGroupLeader ? currentUser.groups : ['all']) : next };
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

    doc.save(`gallery-audience-${new Date().toISOString().slice(0, 10)}.pdf`);
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
    const matchesSearch = album.title.toLowerCase().includes(search.toLowerCase()) ||
      album.description.toLowerCase().includes(search.toLowerCase());

    // Group leaders only see albums targeted at their groups
    if (isGroupLeader) {
      const aGroups = album.targetGroups ?? ['all'];
      if (!aGroups.includes('all') && !aGroups.some(g => currentUser.groups.includes(g))) {
        return false;
      }
    }
    return matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.startsWith('https://photos.app.goo.gl/') && !form.url.startsWith('https://photos.google.com/')) {
      import('sonner').then(({ toast }) => toast.error('Please enter a valid Google Photos album URL (e.g. https://photos.app.goo.gl/...).'));
      return;
    }
    
    if (editingId !== null) {
      updateGalleryAlbum(editingId, form);
      setEditingId(null);
    } else {
      addGalleryAlbum(form);
      setIsAdding(false);
    }
    setForm({ title: '', description: '', url: '', coverImage: '', category: 'Worship', targetCampuses: ['all'], targetGroups: ['all'], excludeCampuses: [], excludeGroups: [] });
  };

  const handleEdit = (album: GalleryAlbum) => {
    setForm({
      title: album.title,
      description: album.description,
      url: album.url,
      coverImage: album.coverImage || '',
      category: album.category,
      targetCampuses: album.targetCampuses || ['all'],
      targetGroups: album.targetGroups || ['all'],
      excludeCampuses: album.excludeCampuses || [],
      excludeGroups: album.excludeGroups || [],
    });
    setEditingId(album.id);
    setIsAdding(true);
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
          <p className="text-muted-foreground italic">Manage church photo albums from Google Photos</p>
        </div>
        {!isAdding && (
          <Button onClick={() => {
            setForm({
              title: '', description: '', url: '', coverImage: '', category: 'Worship',
              targetCampuses: (isCampusLeader || isGroupLeader) ? [currentUser.campusId] : ['all'],
              targetGroups: isGroupLeader ? currentUser.groups : ['all'],
              excludeCampuses: [],
              excludeGroups: [],
            });
            setEditingId(null);
            setIsAdding(true);
          }} className="rounded-full px-6 hover-lift">
            <Plus className="w-4 h-4 mr-2" /> New Album
          </Button>
        )}
      </div>

      {isAdding ? (
        <Card className="glass-card border-0 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <CardHeader className="border-b border-border/50 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl italic">{editingId ? 'Edit Album' : 'Create New Album'}</CardTitle>
                <CardDescription>Enter the Google Photos album details below</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setIsAdding(false); setEditingId(null); }} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-bold uppercase tracking-wider">Album Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Youth Camp 2024"
                    required
                    className="bg-background/50 border-border/50 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-bold uppercase tracking-wider">Google Photos URL</Label>
                <div className="relative">
                  <Input
                    id="url"
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    placeholder="https://photos.app.goo.gl/..."
                    required
                    className="bg-background/50 border-border/50 focus:ring-primary/20 pl-10"
                  />
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground italic flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3 h-3" /> Make sure the album is shared and anyone with the link can view it.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverImage" className="text-sm font-bold uppercase tracking-wider">Thumbnail Image URL (Optional)</Label>
                <div className="relative">
                  <Input
                    id="coverImage"
                    value={form.coverImage || ''}
                    onChange={e => setForm({ ...form, coverImage: e.target.value })}
                    placeholder="https://... (Leave blank to use first photo)"
                    className="bg-background/50 border-border/50 focus:ring-primary/20 pl-10"
                  />
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>



              {/* Audience Targeting */}
              <div className="border-t border-border/50 pt-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" /> Audience Targeting
                </h4>
                {/* Campus */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Broadcast to Campuses</Label>
                  {isCampusLeader && (
                    <p className="text-[10px] text-amber-500">Campus Leader: restricted to {campuses.find(c => c.id === currentUser.campusId)?.name}</p>
                  )}
                  {isGroupLeader && (
                    <p className="text-[10px] text-emerald-500">Group Leader: restricted to {campuses.find(c => c.id === currentUser.campusId)?.name}</p>
                  )}
                  {hasGlobalScope(currentUser.role) && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={campusMode === 'all'} onCheckedChange={() => setCampusMode('all')} disabled={isCampusLeader || isGroupLeader} /> All
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={campusMode === 'specific'} onCheckedChange={() => setCampusMode('specific')} disabled={isCampusLeader || isGroupLeader} /> Specific
                      </label>
                    </div>
                  )}
                  {(campusMode !== 'all' || !hasGlobalScope(currentUser.role)) && (
                    <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                      {getAllowedCampuses(currentUser.role, currentUser.campusId, campuses).map(c => (
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

                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Exclude Campuses (Optional)</Label>
                    <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                      {campuses.map(c => (
                        <label key={`ex-${c.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={(form.excludeCampuses || []).includes(c.id)}
                            onCheckedChange={() => toggleExcludeCampus(c.id)}
                            disabled={(isCampusLeader || isGroupLeader) && c.id !== currentUser.campusId}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Groups */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-muted-foreground">Visible to Groups</Label>
                  {isGroupLeader && (
                    <p className="text-[10px] text-emerald-500">Group Leader: restricted to your assigned groups</p>
                  )}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={groupMode === 'all'} onCheckedChange={() => setGroupMode('all')} /> All
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={groupMode === 'specific'} onCheckedChange={() => setGroupMode('specific')} /> Specific
                    </label>
                  </div>
                  {groupMode !== 'all' && (
                    <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                      {(() => {
                        // Filter groups based on selected campuses
                        const selectedCampusIds = campusMode === 'all' ? ['global'] : (form.targetCampuses || []);
                        const visibleGroups = campusMode === 'all'
                          ? groups
                          : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                        return getAllowedGroups(currentUser.role, currentUser.groups, groupScopes, currentUser.campusId)
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
                    {groupMode === 'all' ? '👥 All Groups' : `👤 ${(form.targetGroups || []).join(', ') || 'None'}`}
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
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowBroadcastList(!showBroadcastList);
                                }}
                                className="h-6 text-[10px] px-2 bg-[#8B2323] hover:bg-[#721515] text-white hover:text-white"
                              >
                                {showBroadcastList ? 'Hide Members' : 'Show Members'}
                              </Button>
                            </div>
                          )}
                        </div>
                        {showBroadcastList && broadcastUsers.length > 0 && (
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {broadcastUsers.map(u => (
                              <div key={u.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-foreground font-medium leading-none">{u.name}</span>
                                  <span className="text-muted-foreground text-[10px] mt-0.5 leading-none">
                                    {campuses.find(c => c.id === u.campusId)?.name || 'Unknown Campus'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
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

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); }} className="rounded-full px-6 sm:px-8 border-border/50">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full px-8 sm:px-10 font-bold hover-lift">
                  <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Album' : 'Create Album'}
                </Button>
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
                  <ImageIcon className="w-12 h-12 text-primary/10 group-hover:scale-125 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-primary text-primary-foreground border-0">
                      {album.category}
                    </Badge>

                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-1 italic">{album.title}</h3>
                  </div>
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">


                  {/* Audience Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
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
                        className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => handleEdit(album)}
                      >
                        <ImageIcon className="w-4 h-4" />
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
                    <a href={album.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-9 group/btn px-2 hover:bg-transparent text-primary">
                        Link <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
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
                <Button variant="outline" onClick={() => setIsAdding(true)} className="rounded-full px-8">
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
