"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Pencil, Trash2, RefreshCw, Link2, X, SquareArrowOutUpRight, ChevronLeft, ChevronRight, Megaphone, Users, Download } from 'lucide-react';
import { useAdminData, getAllowedCampuses, getAllowedGroups, getGroupsForCampus, hasGlobalScope, isCoreTeamLeader, isFasLeader } from '@/lib/admin-data-context';
import { CompactStackedList, mapUsersToStackedMembers } from '@/components/ui/stacked-list';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { DEFAULT_HIGHLIGHT_FIELDS, withHighlightExpiry } from '@/lib/highlight-utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const emptyForm = {
  title: '',
  description: '',
  targetCampuses: ['all'] as string[],
  targetGroups: ['all'] as string[],
  excludeCampuses: [] as string[],
  excludeGroups: [] as string[],
  materialLinks: [{ label: '', url: '' }],
  ...DEFAULT_HIGHLIGHT_FIELDS,
};

export default function AdminBroadcastsPage() {
  const { campuses, groups, groupScopes, users, currentUser } = useAdminData();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [broadcastFormStep, setBroadcastFormStep] = useState<'basics' | 'links' | 'audience'>('basics');
  const [showBroadcastList, setShowBroadcastList] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isCampusLeader = currentUser.role === 'campus_leader';
  const isGroupLeader = currentUser.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser.role, currentUser.campusId);
  const isFas = isFasLeader(currentUser.role, currentUser.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'broadcasts');

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/broadcasts');
      if (res.ok) setBroadcasts(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const addLink = () => {
    setForm({ ...form, materialLinks: [...form.materialLinks, { label: '', url: '' }] });
  };

  const removeLink = (idx: number) => {
    setForm({ ...form, materialLinks: form.materialLinks.filter((_, i) => i !== idx) });
  };

  const updateLink = (idx: number, field: 'label' | 'url', value: string) => {
    const updated = [...form.materialLinks];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, materialLinks: updated });
  };

  const openCreate = () => {
    setEditingId(null);
    setBroadcastFormStep('basics');
    setShowBroadcastList(false);
    setForm({
      ...emptyForm,
      targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
      targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
      excludeCampuses: [],
      excludeGroups: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingId(b._id);
    setBroadcastFormStep('basics');
    setShowBroadcastList(false);
    setForm({
      title: b.title || '',
      description: b.description || '',
      targetCampuses: b.targetCampuses || ['all'],
      targetGroups: isFas
        ? (b.targetGroups || []).includes('all')
          ? [...currentUser.groups]
          : (b.targetGroups || []).filter((g: string) => g !== 'all' && currentUser.groups.includes(g))
        : (b.targetGroups || ['all']),
      excludeCampuses: campusLocked ? [] : (b.excludeCampuses || []),
      excludeGroups: b.excludeGroups || [],
      materialLinks: b.materialLinks?.length ? b.materialLinks : [{ label: '', url: '' }],
      showOnHighlight: !!b.showOnHighlight,
      highlightDurationHours: b.highlightDurationHours || 24,
      highlightExpiresAt: b.highlightExpiresAt || null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const validLinks = form.materialLinks.filter(l => l.label.trim() && l.url.trim());
    const payload = withHighlightExpiry({ ...form, materialLinks: validLinks });

    try {
      const url = editingId ? `/api/admin/broadcasts/${editingId}` : '/api/admin/broadcasts';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editingId ? 'Note share updated!' : 'Note share published!');
        setDialogOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchBroadcasts();
      } else {
        toast.error(editingId ? 'Failed to update note share' : 'Failed to create note share');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note share?')) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Note share deleted');
        fetchBroadcasts();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleExportPDF = (broadcastUsers: any[]) => {
    const doc = new jsPDF();
    doc.text(`Broadcast Member List`, 14, 15);
    doc.text(`Target: ${form.title || 'Untitled Note Share'}`, 14, 22);

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

    doc.save(`broadcast-members-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exported successfully');
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
    XLSX.writeFile(workbook, `broadcast-members-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exported successfully');
  };

  // ── Audience helpers ──
  const campusMode = form.targetCampuses.includes('all') ? 'all' : 'specific';
  const groupMode = isFas
    ? 'specific'
    : (form.targetGroups.includes('all') || (isGroupLeader && form.targetGroups.length === currentUser.groups.length && currentUser.groups.length > 0) ? 'all' : 'specific');

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (campusLocked) return;
    setForm(f => ({
      ...f,
      targetCampuses: mode === 'specific' ? [] : ['all'],
    }));
  };

  const toggleCampus = (campusId: string) => {
    if (campusLocked) return;
    setForm(f => {
      const has = f.targetCampuses.includes(campusId);
      const next = has ? f.targetCampuses.filter(c => c !== campusId) : [...f.targetCampuses.filter(c => c !== 'all'), campusId];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (campusId: string) => {
    if (campusLocked) return;
    setForm(f => {
      const has = f.excludeCampuses.includes(campusId);
      const next = has ? f.excludeCampuses.filter(c => c !== campusId) : [...f.excludeCampuses, campusId];
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

  const toggleGroup = (group: string) => {
    setForm(f => {
      const has = f.targetGroups.includes(group);
      const next = has ? f.targetGroups.filter(g => g !== group) : [...f.targetGroups.filter(g => g !== 'all'), group];
      if (next.length === 0) {
        return { ...f, targetGroups: isFas ? [] : (isGroupLeader ? currentUser.groups : ['all']) };
      }
      return { ...f, targetGroups: next };
    });
  };

  const toggleExcludeGroup = (group: string) => {
    setForm(f => {
      const has = f.excludeGroups.includes(group);
      const next = has ? f.excludeGroups.filter(g => g !== group) : [...f.excludeGroups, group];
      return { ...f, excludeGroups: next };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold font-serif text-[#1A202C]">Note Share</h1>
          <p className="text-[#7A6150] mt-1 font-medium">
            Share notes, materials, and resources with your community
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Note Share
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[#7A6150]" />
        </div>
      ) : broadcasts.length === 0 ? (
        <Card className="border border-dashed border-[#E5D5C5] bg-[#FAF7F2]/60 rounded-2xl">
          <CardContent className="p-10 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E5D5C5]/40 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-[#8B2323]/70" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#1A202C] mb-1.5">No Notes Shared Yet</h3>
            <p className="text-sm text-[#7A6150] mb-5 max-w-sm mx-auto">
              Publish your first note to share notes and materials with the community.
            </p>
            <Button
              onClick={openCreate}
              className="gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Create Note Share
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {broadcasts.map(b => (
            <Card key={b._id} className="overflow-hidden group hover:shadow-md transition-shadow border-[#E5D5C5]/60 bg-white rounded-2xl">
              <CardHeader className="bg-gradient-to-br from-[#8B2323]/5 to-transparent pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-[#1A202C] truncate">{b.title}</h3>
                    <p className="text-xs text-[#7A6150] mt-0.5">
                      By {b.createdByName || 'Unknown'} • {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#7A6150] hover:text-[#3A2D27] hover:bg-[#F3EAE1]"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(b._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-[#7A6150] line-clamp-3">{b.description}</p>
                {b.materialLinks && b.materialLinks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E5D5C5]/50">
                    <p className="text-[10px] font-bold text-[#7A6150] uppercase tracking-wider">Materials</p>
                    {b.materialLinks.map((link: any, idx: number) => {
                      const href = (() => {
                        const trimmed = (link.url || '').trim();
                        if (!trimmed) return null;
                        if (/^https?:\/\//i.test(trimmed)) return trimmed;
                        if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
                        return `https://${trimmed.replace(/^\/+/, '')}`;
                      })();
                      if (!href) {
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm text-[#7A6150] p-2 rounded-xl bg-[#F3EAE1]/50">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="inline-flex w-full -space-x-px rounded-xl shadow-sm shadow-black/5">
                          <Button
                            asChild
                            variant="outline"
                            className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 h-9 px-3 text-sm font-medium text-[#8B2323] border-[#E5D5C5]/60 bg-[#F3EAE1]/50 hover:bg-[#F3EAE1]"
                          >
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{link.label}</span>
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 h-9 w-9 shrink-0 border-[#E5D5C5]/60 bg-[#F3EAE1]/50 hover:bg-[#F3EAE1] text-[#8B2323]"
                            aria-label={`Open ${link.label || 'material'}`}
                          >
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              <SquareArrowOutUpRight size={16} strokeWidth={2} aria-hidden="true" />
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingId ? 'Edit Note Share' : 'New Note Share'}
            </DialogTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: Megaphone },
                { id: 'links' as const, label: 'Links', icon: Link2 },
                { id: 'audience' as const, label: 'Audience', icon: Users },
              ]).map((step, idx) => {
                const active = broadcastFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'links', 'audience'] as const;
                const done = order.indexOf(broadcastFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setBroadcastFormStep(step.id)}
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

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            {broadcastFormStep === 'basics' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B2323]" /> Note Details
                  </h3>
                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">Title</Label>
                    <Input
                      className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Sunday Service Notes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">Description <span className="text-[#7A6150] font-normal">(optional)</span></Label>
                    <textarea
                      className="w-full border border-[#E5D5C5]/60 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B2323]/30 min-h-[100px] bg-[#FAF7F2]"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Write your notes, message summary, or any instructions here..."
                      rows={4}
                    />
                  </div>
                </div>

                <HighlightPublishOptions
                  showOnHighlight={form.showOnHighlight}
                  highlightDurationHours={form.highlightDurationHours}
                  onShowChange={(show) => setForm({ ...form, showOnHighlight: show })}
                  onDurationChange={(hours) => setForm({ ...form, highlightDurationHours: hours })}
                />
              </div>
            )}

            {broadcastFormStep === 'links' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center gap-2">
                    <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#8B2323]" /> Material Links
                    </h3>
                    <Button type="button" variant="ghost" size="sm" onClick={addLink} className="text-xs text-[#8B2323] hover:text-[#721515] hover:bg-[#FBE8E8]">
                      <Plus className="w-3 h-3 mr-1" /> Add Link
                    </Button>
                  </div>
                  {form.materialLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-[#FAF7F2] border border-[#E5D5C5]/50 p-3 rounded-xl">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Label (e.g. Canva Slides)"
                          value={link.label}
                          onChange={e => updateLink(idx, 'label', e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                        <Input
                          placeholder="https://..."
                          value={link.url}
                          onChange={e => updateLink(idx, 'url', e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      {form.materialLinks.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 mt-1" onClick={() => removeLink(idx)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {broadcastFormStep === 'audience' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B2323]" />
                    Audience Targeting
                  </h3>

                  {/* Campus Targeting */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Broadcast to Campuses</Label>
                    {isCampusLeader && (
                      <p className="text-[10px] text-amber-500">
                        As a Campus Pastor, you can only broadcast to your campus: {campuses.find(c => c.id === currentUser.campusId)?.name}
                      </p>
                    )}
                    {isFas && (
                      <p className="text-[10px] text-emerald-500">
                        FASL Leader: restricted to your campus ({campuses.find(c => c.id === currentUser.campusId)?.name}) and assigned groups.
                      </p>
                    )}
                    {isCore && (
                      <p className="text-[10px] text-emerald-500">
                        Core Team Leader: all campuses, your assigned teams only.
                      </p>
                    )}
                    {canAllCampusesScope && (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={campusMode === 'all'}
                            onCheckedChange={() => setCampusMode('all')}
                            disabled={campusLocked}
                          />
                          All Campuses
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={campusMode === 'specific'}
                            onCheckedChange={() => setCampusMode('specific')}
                            disabled={campusLocked}
                          />
                          Specific
                        </label>
                      </div>
                    )}
                    {(campusMode !== 'all' || !canAllCampusesScope) && (
                      <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                        {getAllowedCampuses(currentUser, campuses, 'broadcasts').map(campus => (
                          <label key={campus.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={form.targetCampuses.includes(campus.id)}
                              onCheckedChange={() => toggleCampus(campus.id)}
                            />
                            {campus.name}
                          </label>
                        ))}
                      </div>
                    )}

                    {!campusLocked && (
                      <div className="pt-2">
                        <Label className="text-xs text-muted-foreground">Exclude Campuses (Optional)</Label>
                        <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                          {campuses.map(campus => (
                            <label key={`ex-${campus.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={form.excludeCampuses.includes(campus.id)}
                                onCheckedChange={() => toggleExcludeCampus(campus.id)}
                              />
                              {campus.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group Targeting */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">Visible to Groups</Label>
                    {isGroupLeader && (
                      <p className="text-[10px] text-emerald-500">
                        {isCore
                          ? 'Core Team Leader: you can only broadcast to your assigned groups across campuses.'
                          : 'FASL Leader: select from your assigned groups.'}
                      </p>
                    )}
                    {!isFas && (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={groupMode === 'all'} onCheckedChange={() => setGroupMode('all')} />
                          All Groups
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={groupMode === 'specific'} onCheckedChange={() => setGroupMode('specific')} />
                          Specific
                        </label>
                      </div>
                    )}
                    {(groupMode !== 'all' || isFas) && (
                      <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                        {(() => {
                          const selectedCampusIds = campusMode === 'all' ? ['global'] : form.targetCampuses;
                          const visibleGroups = campusMode === 'all'
                            ? groups
                            : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                          return getAllowedGroups(currentUser, groupScopes, 'broadcasts')
                            .filter(g => visibleGroups.includes(g))
                            .map(group => (
                            <label key={group} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={form.targetGroups.includes(group)}
                                onCheckedChange={() => toggleGroup(group)}
                              />
                              {group}
                            </label>
                          ));
                        })()}
                      </div>
                    )}

                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground">Exclude Groups (Optional)</Label>
                      <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                        {(() => {
                          const selectedCampusIds = campusMode === 'all' ? ['global'] : form.targetCampuses;
                          const visibleGroups = campusMode === 'all'
                            ? groups
                            : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                          return visibleGroups.map(group => (
                            <label key={`ex-${group}`} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={form.excludeGroups.includes(group)}
                                onCheckedChange={() => toggleExcludeGroup(group)}
                                disabled={isGroupLeader && !currentUser.groups.includes(group)}
                              />
                              {group}
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
                      {campusMode === 'all' ? '🌐 All Campuses' : `🏢 ${form.targetCampuses.map(id => campuses.find(c => c.id === id)?.name || id).join(', ') || 'None'}`}
                      {form.excludeCampuses.length > 0 && ` (excluding: ${form.excludeCampuses.map(id => campuses.find(c => c.id === id)?.name || id).join(', ')})`}
                      {' · '}
                      {groupMode === 'all' && !isFas ? '👥 All Groups' : `👤 ${form.targetGroups.join(', ') || 'None'}`}
                      {form.excludeGroups.length > 0 && ` (excluding: ${form.excludeGroups.join(', ')})`}
                    </p>
                    {(() => {
                      const broadcastUsers = users.filter(u => {
                        if (form.excludeCampuses.includes(u.campusId)) return false;
                        const tc = form.targetCampuses;
                        const campusMatch = tc.includes('all') || tc.includes(u.campusId);
                        if (!campusMatch) return false;
                        if (u.groups.some(g => form.excludeGroups.includes(g))) return false;
                        const tg = form.targetGroups;
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
                  const order = ['basics', 'links', 'audience'] as const;
                  const idx = order.indexOf(broadcastFormStep);
                  if (idx <= 0) setDialogOpen(false);
                  else setBroadcastFormStep(order[idx - 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                {broadcastFormStep === 'basics' ? 'Cancel' : 'Back'}
              </Button>
              {broadcastFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'links', 'audience'] as const;
                    const idx = order.indexOf(broadcastFormStep);
                    setBroadcastFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
              {broadcastFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'links', 'audience'] as const;
                    const idx = order.indexOf(broadcastFormStep);
                    setBroadcastFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={!form.title.trim()}
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  handleSave();
                }}
              >
                {editingId ? 'Save Changes' : 'Publish'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
