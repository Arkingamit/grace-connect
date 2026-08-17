"use client";

import React, { useState } from 'react';
import { useAdminData, canPublishAllCampuses, getGroupsForCampus, getAllowedCampuses, getAllowedGroups, hasGlobalScope, isCoreTeamLeader, isFasLeader, type Announcement } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SchedulePreviewExport } from '@/components/admin/schedule-preview-export';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { DEFAULT_HIGHLIGHT_FIELDS, withHighlightExpiry } from '@/lib/highlight-utils';
import { CompactStackedList, mapUsersToStackedMembers } from '@/components/ui/stacked-list';
import {
  Megaphone,
  Pin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Heart,
  Globe,
  Building2,
  Users,
  Repeat,
  Clock,
  Download,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ANNOUNCEMENT_CATEGORIES = ['Worship', 'Youth', 'Outreach', 'Membership', 'Urgent'];

const categoryColors: Record<string, string> = {
  Worship: 'bg-primary/10 text-primary',
  Membership: 'bg-blue-500/10 text-blue-600',
  Youth: 'bg-emerald-500/10 text-emerald-600',
  Outreach: 'bg-amber-500/10 text-amber-600',
  Urgent: 'bg-rose-500/10 text-rose-600',
};

const emptyForm = {
  title: '',
  content: '',
  isPinned: false,
  reminderDate: '',
  reminderTime: '',
  endDate: '',
  endTime: '',
  image: null as string | null,
  reactions: 0,
  targetCampuses: ['all'] as string[],
  targetGroups: ['all'] as string[],
  excludeCampuses: [] as string[],
  excludeGroups: [] as string[],
  isRecurring: false,
  recurrencePattern: 'weekly' as 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'custom_monthly',
  recurrenceDay: 'Sunday',
  recurrenceWeekOfMonth: '1st',
  recurrenceEndDate: '',
  recurrenceNote: '',
  customReminders: [] as { daysBefore: number, hoursBefore: number, minutesBefore: number }[],
  ...DEFAULT_HIGHLIGHT_FIELDS,
};

export default function AnnouncementsPage() {
  const { announcements, campuses, groups, groupScopes, users, addAnnouncement, updateAnnouncement, deleteAnnouncement, currentUser } = useAdminData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announcementFormStep, setAnnouncementFormStep] = useState<'basics' | 'options' | 'audience'>('basics');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBroadcastList, setShowBroadcastList] = useState(false);

  const isCampusLeader = currentUser.role === 'campus_leader';
  const isGroupLeader = currentUser.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser.role, currentUser.campusId);
  const isFas = isFasLeader(currentUser.role, currentUser.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'announcements');

  const filtered = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
      
    if (isGroupLeader) {
      const aGroups = a.targetGroups ?? ['all'];
      if (!aGroups.includes('all') && !aGroups.some(g => currentUser.groups.includes(g))) {
        return false;
      }
    }
    return matchesSearch;
  });

  const openCreate = () => {
    setEditingId(null);
    setAnnouncementFormStep('basics');
    setForm({
      ...emptyForm,
      // Campus leaders & FASL: lock to their campus; Core Team Leaders: all campuses
      targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
      targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
    });
    setDialogOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setAnnouncementFormStep('basics');
    setForm({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned,
      reminderDate: announcement.reminderDate || '',
      reminderTime: announcement.reminderTime || '',
      image: announcement.image,
      reactions: announcement.reactions,
      targetCampuses: announcement.targetCampuses || ['all'],
      targetGroups: isFas
        ? (announcement.targetGroups || []).includes('all')
          ? [...currentUser.groups]
          : (announcement.targetGroups || []).filter(g => g !== 'all' && currentUser.groups.includes(g))
        : (announcement.targetGroups || ['all']),
      excludeCampuses: campusLocked ? [] : (announcement.excludeCampuses || []),
      excludeGroups: announcement.excludeGroups || [],
      isRecurring: announcement.isRecurring || false,
      recurrencePattern: announcement.recurrencePattern || 'weekly',
      recurrenceDay: announcement.recurrenceDay || 'Sunday',
      recurrenceWeekOfMonth: announcement.recurrenceWeekOfMonth || '1st',
      recurrenceEndDate: announcement.recurrenceEndDate || '',
      recurrenceNote: announcement.recurrenceNote || '',
      customReminders: announcement.customReminders || [],
      endDate: announcement.endDate || '',
      endTime: announcement.endTime || '',
      showOnHighlight: !!announcement.showOnHighlight,
      highlightDurationHours: announcement.highlightDurationHours || 24,
      highlightExpiresAt: announcement.highlightExpiresAt || null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.content) return;
    const payload = withHighlightExpiry(form);
    if (editingId !== null) {
      updateAnnouncement(editingId, payload);
    } else {
      addAnnouncement(payload);
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteAnnouncement(id);
    setDeleteConfirmId(null);
  };

  const handleExportPDF = (broadcastUsers: any[]) => {
    const doc = new jsPDF();
    doc.text(`Broadcast Member List`, 14, 15);
    doc.text(`Target: ${form.title || 'Untitled Announcement'}`, 14, 22);

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
  // ── Audience helpers ──
  const campusMode = form.targetCampuses.includes('all') ? 'all' : 'specific';
  const groupMode = isFas
    ? 'specific'
    : (form.targetGroups.includes('all') || (isGroupLeader && form.targetGroups.length === currentUser.groups.length && currentUser.groups.length > 0) ? 'all' : 'specific');

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (campusLocked) return; // locked for campus leader / FASL
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

  const getAudienceLabel = (a: Announcement) => {
    const parts: string[] = [];
    if (a.targetCampuses?.includes('all')) {
      parts.push('All Campuses');
    } else if (a.targetCampuses?.length) {
      parts.push(a.targetCampuses.map(id => campuses.find(c => c.id === id)?.name || id).join(', '));
    }
    if (a.targetGroups?.includes('all')) {
      parts.push('All Groups');
    } else if (a.targetGroups?.length) {
      parts.push(a.targetGroups.join(', '));
    }
    return parts.join(' · ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">Publish and manage church announcements</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto gap-2 shrink-0 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl">
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((announcement) => (
          <Card key={announcement.id} className="border-border/50 hover:shadow-md transition-shadow group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {announcement.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-accent fill-current shrink-0" />
                    )}

                    {announcement.isRecurring && (
                      <Badge variant="outline" className="text-[9px] gap-1 border-violet-500/30 text-violet-600">
                        <Repeat className="w-2.5 h-2.5" />
                        {announcement.recurrencePattern === 'weekly' ? `Every ${announcement.recurrenceDay || 'week'}`
                          : announcement.recurrencePattern === 'biweekly' ? `Bi-weekly ${announcement.recurrenceDay || ''}`
                          : announcement.recurrencePattern === 'monthly' ? `Monthly`
                          : announcement.recurrenceNote || 'Recurring'}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold leading-tight">{announcement.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {announcement.reminderDate && announcement.reminderTime && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Calendar className="w-3 h-3" />
                        <span>Scheduled: {announcement.reminderDate} at {announcement.reminderTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>{announcement.reactions}</span>
                    </div>
                    {announcement.isRecurring && announcement.nextOccurrence && (
                      <div className="flex items-center gap-1 text-violet-500">
                        <Clock className="w-3 h-3" />
                        <span>Next: {new Date(announcement.nextOccurrence).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    {announcement.isRecurring && announcement.lastTriggered && (
                      <div className="flex items-center gap-1 text-emerald-500">
                        <span>Last sent: {new Date(announcement.lastTriggered).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {/* Audience Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {announcement.targetCampuses?.includes('all') ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/30 text-amber-600">
                        <Globe className="w-2.5 h-2.5" /> All Campuses
                      </Badge>
                    ) : (
                      announcement.targetCampuses?.map(id => (
                        <Badge key={id} variant="outline" className="text-[9px] gap-1 border-blue-500/30 text-blue-600">
                          <Building2 className="w-2.5 h-2.5" /> {campuses.find(c => c.id === id)?.name || id}
                        </Badge>
                      ))
                    )}
                    {announcement.targetGroups?.includes('all') ? (
                      <Badge variant="outline" className="text-[9px] gap-1 border-emerald-500/30 text-emerald-600">
                        <Users className="w-2.5 h-2.5" /> All Groups
                      </Badge>
                    ) : (
                      announcement.targetGroups?.map(g => (
                        <Badge key={g} variant="outline" className="text-[9px] gap-1 border-purple-500/30 text-purple-600">
                          <Users className="w-2.5 h-2.5" /> {g}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(announcement)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(announcement.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{announcement.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No announcements found</p>
          <Button onClick={openCreate} className="mt-4 gap-2 w-full sm:w-auto bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl">
            <Plus className="w-4 h-4" /> Create your first announcement
          </Button>
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: Calendar },
                { id: 'options' as const, label: 'Options', icon: SlidersHorizontal },
                { id: 'audience' as const, label: 'Audience', icon: Users },
              ]).map((step, idx) => {
                const active = announcementFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'options', 'audience'] as const;
                const done = order.indexOf(announcementFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setAnnouncementFormStep(step.id)}
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
            {/* ── Step 1: Basics ── */}
            {announcementFormStep === 'basics' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B2323]" /> Announcement Details
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="a-title" className="text-[#3A2D27] font-semibold">Title *</Label>
                    <Input
                      id="a-title"
                      className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Announcement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="a-content" className="text-[#3A2D27] font-semibold">Content *</Label>
                    <Textarea
                      id="a-content"
                      className="rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 min-h-[88px]"
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="Write the announcement content..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Options ── */}
            {announcementFormStep === 'options' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8B2323]" /> Schedule & Expiration
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="a-reminder-date" className="text-[#3A2D27] font-semibold">Schedule Date (Optional)</Label>
                      <Input
                        id="a-reminder-date"
                        type="date"
                        className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                        value={form.reminderDate}
                        onChange={(e) => setForm({ ...form, reminderDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-reminder-time" className="text-[#3A2D27] font-semibold">Schedule Time</Label>
                      <Input
                        id="a-reminder-time"
                        type="time"
                        className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                        value={form.reminderTime}
                        onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                        disabled={!form.reminderDate}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="a-end-date" className="text-[#3A2D27] font-semibold">Expiration Date (Optional)</Label>
                      <Input
                        id="a-end-date"
                        type="date"
                        className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                        value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-end-time" className="text-[#3A2D27] font-semibold">Expiration Time</Label>
                      <Input
                        id="a-end-time"
                        type="time"
                        className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        disabled={!form.endDate}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/50 px-3 py-3">
                    <Switch id="a-pinned" checked={form.isPinned} onCheckedChange={(checked) => setForm({ ...form, isPinned: checked })} />
                    <Label htmlFor="a-pinned" className="font-semibold text-[#3A2D27]">Pin announcement</Label>
                  </div>
                </div>

                {/* ── Recurring Section ── */}
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="a-recurring"
                      checked={form.isRecurring}
                      onCheckedChange={(checked) => setForm({ ...form, isRecurring: checked })}
                    />
                    <Label htmlFor="a-recurring" className="flex items-center gap-2 font-semibold text-[#3A2D27]">
                      <Repeat className="w-4 h-4 text-violet-500" />
                      Recurring Announcement
                    </Label>
                  </div>

                  {form.isRecurring && (
                    <div className="pl-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="text-xs text-muted-foreground bg-violet-500/10 p-2 rounded-md flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Recurring sequence is based on the Creation Date: <span className="font-semibold text-foreground">{new Date().toISOString().split('T')[0]}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Pattern</Label>
                          <Select
                            value={form.recurrencePattern}
                            onValueChange={(v) => setForm({ ...form, recurrencePattern: v as any })}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Every Week</SelectItem>
                              <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                              <SelectItem value="monthly">Every Month</SelectItem>
                              <SelectItem value="custom_monthly">Custom Monthly (e.g. 2nd Thursday)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {form.recurrencePattern === 'custom_monthly' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Week</Label>
                              <Select value={form.recurrenceWeekOfMonth} onValueChange={(v) => setForm({ ...form, recurrenceWeekOfMonth: v as any })}>
                                <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1st">First</SelectItem>
                                  <SelectItem value="2nd">Second</SelectItem>
                                  <SelectItem value="3rd">Third</SelectItem>
                                  <SelectItem value="4th">Fourth</SelectItem>
                                  <SelectItem value="last">Last</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Day</Label>
                              <Select value={form.recurrenceDay} onValueChange={(v) => setForm({ ...form, recurrenceDay: v })}>
                                <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {(form.recurrencePattern === 'weekly' || form.recurrencePattern === 'biweekly') && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Day</Label>
                            <Select
                              value={form.recurrenceDay}
                              onValueChange={(v) => setForm({ ...form, recurrenceDay: v })}
                            >
                              <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {form.recurrencePattern === 'custom' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Custom Schedule Note</Label>
                          <Input
                            className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                            value={form.recurrenceNote}
                            onChange={(e) => setForm({ ...form, recurrenceNote: e.target.value })}
                            placeholder="e.g. Every 1st and 3rd Sunday, Last Friday of month"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Recurring Until (optional)</Label>
                        <Input
                          type="date"
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          value={form.recurrenceEndDate}
                          onChange={(e) => setForm({ ...form, recurrenceEndDate: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground">Leave empty for indefinite recurring</p>
                      </div>

                      <div className="pt-2">
                        <SchedulePreviewExport
                          title={form.title || 'Untitled Announcement'}
                          startDate={new Date().toISOString().split('T')[0]} // Announcements start when created/published
                          endDate={form.recurrenceEndDate}
                          pattern={form.recurrencePattern}
                          dayOfWeek={form.recurrenceDay}
                          weekOfMonth={form.recurrenceWeekOfMonth}
                        />
                      </div>

                      {/* Reminders */}
                      <div className="border-t border-border/50 pt-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Megaphone className="w-4 h-4 text-primary" /> Automated Reminders
                            </h4>
                            <p className="text-[10px] text-muted-foreground">Automatically send a push notification/announcement a specific amount of time before the scheduled recurring time.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-dashed"
                            onClick={() => setForm(f => ({
                              ...f,
                              customReminders: [...(f.customReminders || []), { daysBefore: 0, hoursBefore: 1, minutesBefore: 0 }]
                            }))}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Reminder
                          </Button>
                        </div>
                        {form.customReminders?.length > 0 && (
                          <div className="space-y-2 pl-1">
                            {form.customReminders.map((rem: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={rem.daysBefore}
                                      className="h-8 text-xs w-14"
                                      onChange={(e) => {
                                        const newRems = [...form.customReminders];
                                        newRems[idx].daysBefore = parseInt(e.target.value) || 0;
                                        setForm({ ...form, customReminders: newRems });
                                      }}
                                    />
                                    <span className="text-[10px] text-muted-foreground uppercase mr-2">Days</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="23"
                                      value={rem.hoursBefore}
                                      className="h-8 text-xs w-14"
                                      onChange={(e) => {
                                        const newRems = [...form.customReminders];
                                        newRems[idx].hoursBefore = parseInt(e.target.value) || 0;
                                        setForm({ ...form, customReminders: newRems });
                                      }}
                                    />
                                    <span className="text-[10px] text-muted-foreground uppercase mr-2">Hrs</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={rem.minutesBefore}
                                      className="h-8 text-xs w-14"
                                      onChange={(e) => {
                                        const newRems = [...form.customReminders];
                                        newRems[idx].minutesBefore = parseInt(e.target.value) || 0;
                                        setForm({ ...form, customReminders: newRems });
                                      }}
                                    />
                                    <span className="text-[10px] text-muted-foreground uppercase">Mins</span>
                                  </div>
                                  <div className="flex-1" />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={() => {
                                      const newRems = [...form.customReminders];
                                      newRems.splice(idx, 1);
                                      setForm({ ...form, customReminders: newRems });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <HighlightPublishOptions
                  showOnHighlight={form.showOnHighlight}
                  highlightDurationHours={form.highlightDurationHours}
                  onShowChange={(show) => setForm({ ...form, showOnHighlight: show })}
                  onDurationChange={(hours) => setForm({ ...form, highlightDurationHours: hours })}
                />
              </div>
            )}

            {/* ── Step 3: Audience ── */}
            {announcementFormStep === 'audience' && (
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
                        {getAllowedCampuses(currentUser, campuses, 'announcements').map(campus => (
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
                          return getAllowedGroups(currentUser, groupScopes, 'announcements')
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
                  const order = ['basics', 'options', 'audience'] as const;
                  const idx = order.indexOf(announcementFormStep);
                  if (idx <= 0) setDialogOpen(false);
                  else setAnnouncementFormStep(order[idx - 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                {announcementFormStep === 'basics' ? 'Cancel' : 'Back'}
              </Button>
              {announcementFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'options', 'audience'] as const;
                    const idx = order.indexOf(announcementFormStep);
                    setAnnouncementFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
              {announcementFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'options', 'audience'] as const;
                    const idx = order.indexOf(announcementFormStep);
                    setAnnouncementFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={!form.title || !form.content}
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  handleSubmit();
                }}
              >
                {editingId ? 'Save Changes' : 'Publish'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Announcement?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
