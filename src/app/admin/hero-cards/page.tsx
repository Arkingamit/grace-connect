"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FlipHorizontal,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Clock,
  Calendar,
  SlidersHorizontal,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAdminData, getGroupsForCampus, type FlipCardItem } from '@/lib/admin-data-context';
import {
  HIGHLIGHT_DURATION_OPTIONS,
  applyHighlightExpiryToFlipItem,
} from '@/lib/highlight-utils';
import { toast } from 'sonner';

type HighlightFormStep = 'basics' | 'options' | 'audience';

const STEP_ORDER: HighlightFormStep[] = ['basics', 'options', 'audience'];

const defaultItemFields = {
  type: 'custom' as FlipCardItem['type'],
  itemId: '',
  title: '',
  description: '',
  buttonText: 'Read More',
  buttonLink: '/',
  targetCampuses: ['all'] as string[],
  targetGroups: ['all'] as string[],
  excludeCampuses: [] as string[],
  excludeGroups: [] as string[],
  highlightDurationHours: 24,
  highlightExpiresAt: null as string | null,
};

const emptyItem = (): FlipCardItem => ({
  id: Math.random().toString(36).substring(7),
  ...defaultItemFields,
});

const TYPE_LABELS: Record<string, string> = {
  custom: 'Custom',
  event: 'Event',
  announcement: 'Announcement',
  sermon: 'Sermon',
  worship_video: 'Worship',
  prayer: 'Prayer',
  note: 'Note',
};

function durationLabel(hours?: number) {
  if (hours === 0) return 'Forever';
  const match = HIGHLIGHT_DURATION_OPTIONS.find((o) => o.value === hours);
  return match?.label || (hours ? `${hours}h` : '1 day');
}

export default function HeroCardsManagementPage() {
  const {
    flipCardConfig,
    updateFlipCardConfig,
    events,
    announcements,
    prayerRequests,
    sermons,
    worshipVideos,
    campuses,
    groups,
    groupScopes,
  } = useAdminData();

  const [items, setItems] = useState<FlipCardItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formStep, setFormStep] = useState<HighlightFormStep>('basics');
  const [form, setForm] = useState<FlipCardItem>(emptyItem());
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(
      (flipCardConfig.items || []).map((item) => ({
        ...defaultItemFields,
        ...item,
        targetCampuses: item.targetCampuses?.length ? item.targetCampuses : ['all'],
        targetGroups: item.targetGroups?.length ? item.targetGroups : ['all'],
        excludeCampuses: item.excludeCampuses || [],
        excludeGroups: item.excludeGroups || [],
        highlightDurationHours:
          item.highlightDurationHours === undefined ? 24 : item.highlightDurationHours,
      })),
    );
  }, [flipCardConfig]);

  const persistItems = (nextItems: FlipCardItem[]) => {
    const withExpiry = nextItems.map(applyHighlightExpiryToFlipItem);
    updateFlipCardConfig({
      ...flipCardConfig,
      items: withExpiry,
      isActive: withExpiry.length > 0,
    });
    setItems(withExpiry);
  };

  const openCreate = () => {
    setEditingIndex(null);
    setForm(emptyItem());
    setFormStep('basics');
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setForm({ ...defaultItemFields, ...items[index] });
    setFormStep('basics');
    setDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (form.type === 'custom' && !form.title?.trim()) {
      toast.warning('Title is required for custom content.');
      return;
    }
    if (form.type !== 'custom' && !form.itemId) {
      toast.warning('Please select an item.');
      return;
    }

    const saved = applyHighlightExpiryToFlipItem(form);
    const next =
      editingIndex !== null
        ? items.map((item, i) => (i === editingIndex ? saved : item))
        : [...items, saved];

    persistItems(next);
    setDialogOpen(false);
    toast.success(editingIndex !== null ? 'Highlight updated!' : 'Highlight added!');
  };

  const handleDelete = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    persistItems(next);
    setDeleteConfirmIndex(null);
    toast.success('Highlight removed');
  };

  const resolveTitle = (item: FlipCardItem) => {
    if (item.type === 'custom') return item.title || 'Untitled';
    if (item.type === 'event') return events.find((e) => e.id === item.itemId)?.title || 'Event';
    if (item.type === 'announcement')
      return announcements.find((a) => a.id === item.itemId)?.title || 'Announcement';
    if (item.type === 'sermon') return sermons.find((s) => s.id === item.itemId)?.title || 'Sermon';
    if (item.type === 'worship_video')
      return worshipVideos.find((w) => w.id === item.itemId)?.title || 'Worship Video';
    if (item.type === 'prayer')
      return prayerRequests.find((p) => p.id === item.itemId)?.title || 'Prayer';
    return item.title || 'Highlight';
  };

  const campusMode = (form.targetCampuses || ['all']).includes('all') ? 'all' : 'specific';
  const groupMode = (form.targetGroups || ['all']).includes('all') ? 'all' : 'specific';
  const selectedCampusIds = campusMode === 'all' ? ['global'] : form.targetCampuses || [];
  const visibleGroups =
    campusMode === 'all'
      ? groups
      : [...new Set(selectedCampusIds.flatMap((cid) => getGroupsForCampus(groupScopes, cid)))];

  const toggleCampus = (campusId: string) => {
    const current = form.targetCampuses || ['all'];
    const has = current.includes(campusId);
    const next = has
      ? current.filter((c) => c !== campusId)
      : [...current.filter((c) => c !== 'all'), campusId];
    setForm({ ...form, targetCampuses: next.length === 0 ? ['all'] : next });
  };

  const toggleGroup = (group: string) => {
    const current = form.targetGroups || ['all'];
    const has = current.includes(group);
    const next = has
      ? current.filter((g) => g !== group)
      : [...current.filter((g) => g !== 'all'), group];
    setForm({ ...form, targetGroups: next.length === 0 ? ['all'] : next });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-[#1A202C]">
            <FlipHorizontal className="w-8 h-8 text-[#8B2323]" />
            Highlights Cards
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage what appears in the home Highlights stack, who sees it, and for how long.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Highlight
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[#E5D5C5]">
          <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No highlight cards yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a highlight to feature events, announcements, or custom content on the home page.
          </p>
          <Button onClick={openCreate} variant="outline" className="rounded-xl border-[#E5D5C5]">
            <Plus className="w-4 h-4 mr-2" /> Add your first highlight
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <Card key={item.id} className="overflow-hidden border-[#E5D5C5]/60">
              <CardHeader className="bg-[#FAF7F2]/60 pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-[10px] border-[#E5C5C5] text-[#8B2323]">
                        {TYPE_LABELS[item.type] || item.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {durationLabel(item.highlightDurationHours)}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-[#1A202C] truncate">{resolveTitle(item)}</h3>
                    {item.type === 'custom' && item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-[#7A6150]">
                  {(item.targetCampuses || ['all']).includes('all')
                    ? 'All Campuses'
                    : `${(item.targetCampuses || []).length} campus(es)`}
                  {' · '}
                  {(item.targetGroups || ['all']).includes('all')
                    ? 'All Groups'
                    : `${(item.targetGroups || []).length} group(s)`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-[#E5D5C5]"
                    onClick={() => openEdit(index)}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-[#E5D5C5] text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteConfirmIndex(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog — stepped like Events / Announcements */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#FAF7F2] border-[#E5D5C5] rounded-[24px]">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4 bg-[#FAF7F2]">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingIndex !== null ? 'Edit Highlight' : 'Add Highlight'}
            </DialogTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(
                [
                  { id: 'basics' as const, label: 'Basics', icon: Calendar },
                  { id: 'options' as const, label: 'Options', icon: SlidersHorizontal },
                  { id: 'audience' as const, label: 'Audience', icon: Users },
                ] as const
              ).map((step, idx) => {
                const active = formStep === step.id;
                const Icon = step.icon;
                const done = STEP_ORDER.indexOf(formStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setFormStep(step.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 sm:px-2 py-2 sm:py-2.5 text-center transition-all border min-w-0 ${
                      active
                        ? 'bg-[#8B2323] text-white border-[#8B2323] shadow-sm'
                        : done
                          ? 'bg-[#FBE8E8] text-[#8B2323] border-[#E5C5C5]'
                          : 'bg-[#FAF7F2] text-[#7A6150] border-[#E5D5C5]/60 hover:bg-[#F3EAE1]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide truncate w-full">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#FAF7F2]">
            {/* Step 1: Basics */}
            {formStep === 'basics' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#8B2323]" /> Content Details
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">Content Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(val: FlipCardItem['type']) =>
                        setForm({ ...form, type: val, itemId: '' })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Content</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="sermon">Sermon</SelectItem>
                        <SelectItem value="worship_video">Worship Video</SelectItem>
                        <SelectItem value="prayer">Prayer Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.type !== 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-[#3A2D27] font-semibold">Select Item</Label>
                      <Select
                        value={form.itemId || ''}
                        onValueChange={(val) => setForm({ ...form, itemId: val })}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.type === 'event' &&
                            events
                              .filter(
                                (e) =>
                                  form.itemId === e.id ||
                                  !items.some(
                                    (i, idx) =>
                                      idx !== editingIndex &&
                                      i.type === 'event' &&
                                      i.itemId === e.id,
                                  ),
                              )
                              .map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.title}
                                </SelectItem>
                              ))}
                          {form.type === 'announcement' &&
                            announcements
                              .filter(
                                (a) =>
                                  form.itemId === a.id ||
                                  !items.some(
                                    (i, idx) =>
                                      idx !== editingIndex &&
                                      i.type === 'announcement' &&
                                      i.itemId === a.id,
                                  ),
                              )
                              .map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.title}
                                </SelectItem>
                              ))}
                          {form.type === 'sermon' &&
                            sermons
                              .filter(
                                (s) =>
                                  form.itemId === s.id ||
                                  !items.some(
                                    (i, idx) =>
                                      idx !== editingIndex &&
                                      i.type === 'sermon' &&
                                      i.itemId === s.id,
                                  ),
                              )
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.title}
                                </SelectItem>
                              ))}
                          {form.type === 'worship_video' &&
                            worshipVideos
                              .filter(
                                (w) =>
                                  form.itemId === w.id ||
                                  !items.some(
                                    (i, idx) =>
                                      idx !== editingIndex &&
                                      i.type === 'worship_video' &&
                                      i.itemId === w.id,
                                  ),
                              )
                              .map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.title}
                                </SelectItem>
                              ))}
                          {form.type === 'prayer' &&
                            prayerRequests
                              .filter(
                                (p) =>
                                  form.itemId === p.id ||
                                  !items.some(
                                    (i, idx) =>
                                      idx !== editingIndex &&
                                      i.type === 'prayer' &&
                                      i.itemId === p.id,
                                  ),
                              )
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.title}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.type === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[#3A2D27] font-semibold">Title *</Label>
                        <Input
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          placeholder="e.g. Welcome to Grace"
                          value={form.title || ''}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#3A2D27] font-semibold">Description</Label>
                        <Input
                          className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                          placeholder="e.g. Join us for worship this Sunday."
                          value={form.description || ''}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#3A2D27] font-semibold">Button Text</Label>
                          <Input
                            className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                            placeholder="e.g. Plan a Visit"
                            value={form.buttonText || ''}
                            onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#3A2D27] font-semibold">Button Link</Label>
                          <Input
                            className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                            placeholder="e.g. /visit"
                            value={form.buttonLink || ''}
                            onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Options (duration) */}
            {formStep === 'options' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8B2323]" /> How long should it stay?
                  </h3>
                  <p className="text-xs text-[#7A6150]">
                    Choose how long this highlight appears on the home page.
                  </p>
                  <Select
                    value={String(form.highlightDurationHours ?? 24)}
                    onValueChange={(v) => {
                      const parsed = parseInt(v, 10);
                      setForm({
                        ...form,
                        highlightDurationHours: Number.isFinite(parsed) ? parsed : 24,
                      });
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {HIGHLIGHT_DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-[#7A6150]">
                    {(form.highlightDurationHours ?? 24) === 0
                      ? 'This item will stay on Highlights until you remove it.'
                      : 'Timer starts when you save. After it ends, the item leaves Highlights automatically.'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Audience */}
            {formStep === 'audience' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B2323]" /> Audience Targeting
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Broadcast to Campuses</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={campusMode === 'all'}
                          onCheckedChange={() => setForm({ ...form, targetCampuses: ['all'] })}
                        />
                        All Campuses
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={campusMode === 'specific'}
                          onCheckedChange={() => setForm({ ...form, targetCampuses: [] })}
                        />
                        Specific
                      </label>
                    </div>
                    {campusMode === 'specific' && (
                      <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                        {campuses.map((campus) => (
                          <label
                            key={campus.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={(form.targetCampuses || []).includes(campus.id)}
                              onCheckedChange={() => toggleCampus(campus.id)}
                            />
                            {campus.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">Visible to Groups</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={groupMode === 'all'}
                          onCheckedChange={() => setForm({ ...form, targetGroups: ['all'] })}
                        />
                        All Groups
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={groupMode === 'specific'}
                          onCheckedChange={() => setForm({ ...form, targetGroups: [] })}
                        />
                        Specific
                      </label>
                    </div>
                    {groupMode === 'specific' && (
                      <div className="grid grid-cols-2 gap-1.5 pl-2 mt-2">
                        {visibleGroups.map((group) => (
                          <label
                            key={group}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={(form.targetGroups || []).includes(group)}
                              onCheckedChange={() => toggleGroup(group)}
                            />
                            {group}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Audience Preview
                    </p>
                    <p className="text-xs">
                      {campusMode === 'all'
                        ? '🌐 All Campuses'
                        : `🏢 ${(form.targetCampuses || [])
                            .map((id) => campuses.find((c) => c.id === id)?.name || id)
                            .join(', ') || 'None'}`}
                      {' · '}
                      {groupMode === 'all'
                        ? '👥 All Groups'
                        : `👤 ${(form.targetGroups || []).join(', ') || 'None'}`}
                    </p>
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
                  const idx = STEP_ORDER.indexOf(formStep);
                  if (idx <= 0) setDialogOpen(false);
                  else setFormStep(STEP_ORDER[idx - 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                {formStep === 'basics' ? 'Cancel' : 'Back'}
              </Button>
              {formStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const idx = STEP_ORDER.indexOf(formStep);
                    setFormStep(STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
              {formStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const idx = STEP_ORDER.indexOf(formStep);
                    setFormStep(STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  handleSaveItem();
                }}
              >
                {editingIndex !== null ? 'Save' : 'Add Highlight'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleteConfirmIndex !== null}
        onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl border-[#E5D5C5] bg-[#FAF7F2]">
          <DialogHeader>
            <DialogTitle className="text-[#1A202C]">Remove highlight?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7A6150]">
            This will remove the card from the home Highlights stack.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#E5D5C5]"
              onClick={() => setDeleteConfirmIndex(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={() =>
                deleteConfirmIndex !== null && handleDelete(deleteConfirmIndex)
              }
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
