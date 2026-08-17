"use client";

import React, { useState } from 'react';
import { useAdminData, canPublishAllCampuses, getGroupsForCampus, getAllowedCampuses, getAllowedGroups, hasGlobalScope, isCoreTeamLeader, isFasLeader, type Event, type EventScheduleDay, type FormField, type FormFieldType } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SchedulePreviewExport } from '@/components/admin/schedule-preview-export';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { DEFAULT_HIGHLIGHT_FIELDS, withHighlightExpiry } from '@/lib/highlight-utils';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  Calendar, Clock, MapPin, Users, Plus, Pencil, Trash2, Search, X,
  Megaphone, Globe, Building2, Image as ImageIcon, Link2, ListPlus, AlignLeft, CheckSquare, ChevronDown, Trash, ListEnd, Download, Repeat, FileText, Copy, Mail, Phone, Hash, SlidersHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getMapsUrl } from '@/lib/maps';
import { MapsPinIcon } from '@/components/ui/maps-pin-icon';
import { CompactStackedList, mapUsersToStackedMembers } from '@/components/ui/stacked-list';
import { memberUnderLeaderScope } from '@/lib/leader-scope';
import { useAdminActionLoading } from '@/components/admin/admin-action-loading';

const EVENT_CATEGORIES = ['Worship', 'Prayer', 'Youth', 'Study', 'Outreach', 'Fellowship'];

const categoryColors: Record<string, string> = {
  Worship: 'bg-primary/10 text-primary',
  Prayer: 'bg-amber-500/10 text-amber-600',
  Youth: 'bg-emerald-500/10 text-emerald-600',
  Study: 'bg-blue-500/10 text-blue-600',
  Outreach: 'bg-rose-500/10 text-rose-600',
  Fellowship: 'bg-purple-500/10 text-purple-600',
};

const emptyForm = {
  title: '', description: '', date: '', time: '', endTime: '',
  location: '', category: 'Worship', capacity: 100, registered: 0,
  image: null as string | null, recurring: false, host: 'Grace Church',
  targetCampuses: ['all'] as string[],
  targetGroups: ['all'] as string[],
  excludeCampuses: [] as string[],
  excludeGroups: [] as string[],
  googlePhotosUrl: '',
  formFields: [] as FormField[],
  isMultiDay: false,
  endDate: '',
  schedule: [] as EventScheduleDay[],
  recurrencePattern: 'weekly' as 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'custom_monthly',
  recurrenceDay: 'Sunday',
  recurrenceWeekOfMonth: '1st',
  recurrenceEndDate: '',
  recurrenceNote: '',
  seriesId: '',
  isSeriesTemplate: false,
  mapUrl: '',
  reminders: [] as string[], // Deprecated
  customReminders: [] as { daysBefore: number, hoursBefore: number, minutesBefore: number }[],
  attendanceConfig: {
    enabled: false,
    radius: 500,
    latitude: 0,
    longitude: 0,
    openMinutesBefore: 30,
    closeMinutesAfter: 30
  },
  allowResponseEdits: true,
  ...DEFAULT_HIGHLIGHT_FIELDS,
};

export default function EventsPage() {
  const { events, campuses, groups, groupScopes, users, addEvent, updateEvent, deleteEvent, currentUser } = useAdminData();
  const { withActionLoading } = useAdminActionLoading();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventFormStep, setEventFormStep] = useState<'basics' | 'options' | 'audience' | 'form'>('basics');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [updateSeriesConfirm, setUpdateSeriesConfirm] = useState<{action: 'put' | 'delete', eventId: string} | null>(null);
  const [showBroadcastList, setShowBroadcastList] = useState(false);
  const [selectedEventForResponses, setSelectedEventForResponses] = useState<Event | null>(null);

  const { getEventRegistrations } = useAdminData();

  const handleExportResponsesExcel = (event: Event, regs: any[]) => {
    const fieldHeaders = new Set<string>();
    regs.forEach(reg => {
      Object.keys(reg.responses).forEach(key => {
         const field = event.formFields?.find(f => f.id === key);
         if (field) fieldHeaders.add(field.label);
      });
    });

    const headers = ['Name', 'Email', 'Registered At', ...Array.from(fieldHeaders)];
    const data = regs.map(reg => {
      const row: any = {
        'Name': reg.userName,
        'Email': reg.userEmail,
        'Registered At': new Date(reg.registeredAt).toLocaleString()
      };
      event.formFields?.forEach(field => {
        if (fieldHeaders.has(field.label)) {
          const answer = reg.responses[field.id];
          row[field.label] = Array.isArray(answer) ? answer.join(', ') : (answer || '');
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
    XLSX.writeFile(workbook, `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.xlsx`);
  };

  const handleExportResponsesPDF = (event: Event, regs: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Responses for: ${event.title}`, 14, 20);

    const fieldHeaders = new Set<string>();
    regs.forEach(reg => {
      Object.keys(reg.responses).forEach(key => {
         const field = event.formFields?.find(f => f.id === key);
         if (field) fieldHeaders.add(field.label);
      });
    });

    const headers = ['Name', 'Email', 'Registered At', ...Array.from(fieldHeaders)];
    const tableData = regs.map(reg => {
      const row = [
        reg.userName,
        reg.userEmail,
        new Date(reg.registeredAt).toLocaleString()
      ];
      event.formFields?.forEach(field => {
        if (fieldHeaders.has(field.label)) {
          const answer = reg.responses[field.id];
          row.push(Array.isArray(answer) ? answer.join(', ') : (answer || ''));
        }
      });
      return row;
    });

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 35, 35] },
    });

    doc.save(`${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.pdf`);
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

    doc.save(`event-audience-${new Date().toISOString().slice(0, 10)}.pdf`);
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
    XLSX.writeFile(workbook, `event-audience-${new Date().toISOString().slice(0, 10)}.xlsx`);
    import('sonner').then(({ toast }) => toast.success('Excel exported successfully'));
  };

  const isCampusLeader = currentUser.role === 'campus_leader';
  const isGroupLeader = currentUser.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser.role, currentUser.campusId);
  const isFas = isFasLeader(currentUser.role, currentUser.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'events');
  const canAllCampuses = canPublishAllCampuses(currentUser.role);

  const filtered = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    
    // Group leaders only see events targeted at their groups
    if (isGroupLeader) {
      const eGroups = e.targetGroups ?? ['all'];
      if (!eGroups.includes('all') && !eGroups.some(g => currentUser.groups.includes(g))) {
        return false;
      }
    }
    return matchesSearch;
  });

  const openCreate = () => {
    setEditingId(null);
    setEventFormStep('basics');
    setForm({
      ...emptyForm,
      targetCampuses: campusLocked ? [currentUser.campusId] : ['all'],
      // FASL/Core: pre-select assigned groups (FASL stays in specific mode)
      targetGroups: isGroupLeader ? [...currentUser.groups] : ['all'],
    });
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setEventFormStep('basics');
    setForm({
      title: event.title, description: event.description, date: event.date,
      time: event.time, endTime: event.endTime, location: event.location,
      category: event.category, capacity: event.capacity, registered: event.registered,
      image: event.image, recurring: event.recurring, host: event.host,
      targetCampuses: event.targetCampuses ?? ['all'],
      targetGroups: isFas
        ? (event.targetGroups ?? []).includes('all')
          ? [...currentUser.groups]
          : (event.targetGroups ?? []).filter(g => g !== 'all' && currentUser.groups.includes(g))
        : (event.targetGroups ?? ['all']),
      excludeCampuses: campusLocked ? [] : (event.excludeCampuses ?? []),
      excludeGroups: event.excludeGroups ?? [],
      googlePhotosUrl: event.googlePhotosUrl || '',
      allowResponseEdits: event.allowResponseEdits !== false,
      formFields: event.formFields || [],
      isMultiDay: event.isMultiDay || false,
      endDate: event.endDate || '',
      schedule: event.schedule || [],
      recurrencePattern: event.recurrencePattern || 'weekly',
      recurrenceDay: event.recurrenceDay || 'Sunday',
      recurrenceWeekOfMonth: event.recurrenceWeekOfMonth || '1st',
      recurrenceEndDate: event.recurrenceEndDate || '',
      recurrenceNote: event.recurrenceNote || '',
      seriesId: event.seriesId || '',
      isSeriesTemplate: event.isSeriesTemplate || false,
      mapUrl: event.mapUrl || '',
      reminders: event.reminders || [],
      customReminders: event.customReminders || [],
      showOnHighlight: !!event.showOnHighlight,
      highlightDurationHours: event.highlightDurationHours || 24,
      highlightExpiresAt: event.highlightExpiresAt || null,
      attendanceConfig: event.attendanceConfig || {
        enabled: false,
        radius: 500,
        latitude: 0,
        longitude: 0,
        openMinutesBefore: 30,
        closeMinutesAfter: 30
      },
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title || form.title.trim().length < 3) {
      import('sonner').then(({ toast }) => toast.warning('Title is required (at least 3 characters).'));
      return;
    }
    if (!form.date) {
      import('sonner').then(({ toast }) => toast.warning('Date is required.'));
      return;
    }
    if (!form.isMultiDay && !form.time) {
      import('sonner').then(({ toast }) => toast.warning('Start Time is required for single-day events.'));
      return;
    }
    if (!form.location || form.location.trim().length < 2) {
      import('sonner').then(({ toast }) => toast.warning('Location is required (at least 2 characters).'));
      return;
    }
    if (!form.host || form.host.trim().length < 2) {
      import('sonner').then(({ toast }) => toast.warning('Host is required (e.g. Grace Church).'));
      return;
    }
    
    // Validate Form Fields
    if (form.formFields && form.formFields.length > 0) {
      for (const field of form.formFields) {
        if (!field.label || field.label.trim().length === 0) {
          import('sonner').then(({ toast }) => toast.warning('All form fields must have a question.'));
          return;
        }
        if (['radio', 'checkbox', 'select'].includes(field.type)) {
          if (!field.options || field.options.length === 0) {
            import('sonner').then(({ toast }) => toast.warning(`Question "${field.label}" must have at least one option.`));
            return;
          }
          for (const opt of field.options) {
            if (!opt.label || opt.label.trim().length === 0) {
              import('sonner').then(({ toast }) => toast.warning(`Option in "${field.label}" cannot be empty.`));
              return;
            }
          }
        }
      }
    }

    const base = campusLocked ? { ...form, excludeCampuses: [] as string[] } : form;
    const payload = withHighlightExpiry(base);

    if (editingId !== null) {
      if (form.recurring && form.seriesId) {
        // Need to ask the user if they want to update the whole series
        setUpdateSeriesConfirm({ action: 'put', eventId: editingId });
        setDialogOpen(false);
        return;
      } else {
        setDialogOpen(false);
        await withActionLoading(async () => {
          await updateEvent(editingId, payload);
          setForm(emptyForm);
          setEditingId(null);
        });
        return;
      }
    } else {
      setDialogOpen(false);
      await withActionLoading(async () => {
        await addEvent(payload);
        setForm(emptyForm);
        setEditingId(null);
      });
    }
  };

  const confirmSubmitSeries = async (updateSeries: boolean) => {
    const confirm = updateSeriesConfirm;
    setUpdateSeriesConfirm(null);
    if (!confirm) return;
    await withActionLoading(async () => {
      if (confirm.action === 'put') {
        const base = campusLocked ? { ...form, excludeCampuses: [] as string[] } : form;
        const payload = withHighlightExpiry(base);
        await updateEvent(confirm.eventId, payload, updateSeries);
        setForm(emptyForm);
        setEditingId(null);
      } else if (confirm.action === 'delete') {
        await deleteEvent(confirm.eventId, updateSeries);
        setDeleteConfirmId(null);
      }
    });
  };

  const handleDeleteClick = (event: Event) => {
    if (event.recurring && event.seriesId) {
      setUpdateSeriesConfirm({ action: 'delete', eventId: event.id });
    } else {
      setDeleteConfirmId(event.id);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    await withActionLoading(async () => {
      await deleteEvent(id);
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Audience helpers
  const campusMode = form.targetCampuses.includes('all') ? 'all' : 'specific';
  // FASL leaders must pick specific assigned groups — no "All" shortcut
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

  const toggleCampus = (id: string) => {
    if (campusLocked) return;
    setForm(f => {
      const has = f.targetCampuses.includes(id);
      const next = has ? f.targetCampuses.filter(c => c !== id) : [...f.targetCampuses.filter(c => c !== 'all'), id];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (id: string) => {
    if (campusLocked) return;
    setForm(f => {
      const has = f.excludeCampuses.includes(id);
      const next = has ? f.excludeCampuses.filter(c => c !== id) : [...f.excludeCampuses, id];
      return { ...f, excludeCampuses: next };
    });
  };

  const setGroupMode = (mode: 'all' | 'specific') => {
    if (isFas) return; // FASL is always specific
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
      const has = f.targetGroups.includes(g);
      const next = has ? f.targetGroups.filter(x => x !== g) : [...f.targetGroups.filter(x => x !== 'all'), g];
      if (next.length === 0) {
        return { ...f, targetGroups: isFas ? [] : (isGroupLeader ? currentUser.groups : ['all']) };
      }
      return { ...f, targetGroups: next };
    });
  };

  const toggleExcludeGroup = (g: string) => {
    setForm(f => {
      const has = f.excludeGroups.includes(g);
      const next = has ? f.excludeGroups.filter(x => x !== g) : [...f.excludeGroups, g];
      return { ...f, excludeGroups: next };
    });
  };

  // ── Multi-day Schedule Helpers ──
  const toggleMultiDay = (enabled: boolean) => {
    setForm(f => ({
      ...f,
      isMultiDay: enabled,
      endDate: enabled ? f.endDate || f.date : '',
      schedule: enabled && f.schedule.length === 0 && f.date
        ? [{ date: f.date, startTime: f.time || '09:00', endTime: f.endTime || '17:00', label: '' }]
        : f.schedule,
    }));
  };

  const addScheduleDay = () => {
    const lastDay = form.schedule[form.schedule.length - 1];
    const nextDate = lastDay?.date
      ? new Date(new Date(lastDay.date).getTime() + 86400000).toISOString().split('T')[0]
      : form.date || new Date().toISOString().split('T')[0];
    setForm(f => ({
      ...f,
      schedule: [...f.schedule, { date: nextDate, startTime: '09:00', endTime: '17:00', label: '' }],
      endDate: nextDate,
    }));
  };

  const updateScheduleDay = (index: number, updates: Partial<EventScheduleDay>) => {
    setForm(f => {
      const newSchedule = f.schedule.map((day, i) => i === index ? { ...day, ...updates } : day);
      // Auto-update endDate to the latest date in the schedule
      const dates = newSchedule.map(d => d.date).filter(Boolean).sort();
      return {
        ...f,
        schedule: newSchedule,
        date: dates[0] || f.date,
        endDate: dates[dates.length - 1] || f.endDate,
      };
    });
  };

  const removeScheduleDay = (index: number) => {
    setForm(f => {
      const newSchedule = f.schedule.filter((_, i) => i !== index);
      const dates = newSchedule.map(d => d.date).filter(Boolean).sort();
      return {
        ...f,
        schedule: newSchedule,
        date: dates[0] || f.date,
        endDate: dates[dates.length - 1] || f.endDate,
      };
    });
  };

  // Form Builder Helpers
  const addField = () => {
    const newField: FormField = { id: `field_${Date.now()}`, type: 'text', label: '', required: false };
    setForm(f => ({ ...f, formFields: [...(f.formFields || []), newField] }));
  };
  const duplicateField = (id: string) => {
    setForm(f => {
      const fieldToCopy = (f.formFields || []).find(field => field.id === id);
      if (!fieldToCopy) return f;
      const newField: FormField = { 
        ...fieldToCopy, 
        id: `field_${Date.now()}`,
        options: fieldToCopy.options?.map(opt => ({ ...opt, id: `opt_${Date.now()}_${Math.random().toString(36).substring(7)}` }))
      };
      
      const idx = (f.formFields || []).findIndex(field => field.id === id);
      const newFields = [...(f.formFields || [])];
      newFields.splice(idx + 1, 0, newField);
      return { ...f, formFields: newFields };
    });
  };
  const addOtherOption = (fieldId: string) => {
    setForm(f => ({
      ...f,
      formFields: (f.formFields || []).map(field => {
        if (field.id === fieldId) {
          const opts = field.options || [];
          if (opts.some(o => o.label === 'Other')) return field; // Already exists
          return { ...field, options: [...opts, { id: `opt_${Date.now()}_other`, label: 'Other' }] };
        }
        return field;
      })
    }));
  };
  const updateField = (id: string, updates: Partial<FormField>) => {
    setForm(f => ({
      ...f,
      formFields: (f.formFields || []).map(field => field.id === id ? { ...field, ...updates } : field)
    }));
  };
  const removeField = (id: string) => {
    setForm(f => ({ ...f, formFields: (f.formFields || []).filter(field => field.id !== id) }));
  };
  const addFieldOption = (fieldId: string) => {
    setForm(f => ({
      ...f,
      formFields: (f.formFields || []).map(field => {
        if (field.id === fieldId) {
          const opts = field.options || [];
          return { ...field, options: [...opts, { id: `opt_${Date.now()}`, label: `Option ${opts.length + 1}` }] };
        }
        return field;
      })
    }));
  };
  const updateFieldOption = (fieldId: string, optId: string, label: string) => {
    setForm(f => ({
      ...f,
      formFields: (f.formFields || []).map(field => {
        if (field.id === fieldId) {
          return { ...field, options: (field.options || []).map(o => o.id === optId ? { ...o, label } : o) };
        }
        return field;
      })
    }));
  };
  const removeFieldOption = (fieldId: string, optId: string) => {
    setForm(f => ({
      ...f,
      formFields: (f.formFields || []).map(field => {
        if (field.id === fieldId) {
          return { ...field, options: (field.options || []).filter(o => o.id !== optId) };
        }
        return field;
      })
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 w-full">
        <div className="min-w-0 w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A202C]">Events</h1>
          <p className="text-sm sm:text-base text-[#7A6150] mt-1 font-medium">
            Manage upcoming events and registration forms
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 w-full sm:w-auto shrink-0 justify-center bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl !px-5"
        >
          <Plus className="w-4 h-4" /> Create Event
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 w-full rounded-xl"
        />
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
        {filtered.map((event) => (
          <Card
            key={event.id}
            className="border border-[#E5D5C5]/60 bg-white hover:shadow-md transition-shadow group rounded-2xl w-full min-w-0 max-w-full overflow-hidden flex flex-col"
          >
            <CardHeader className="pb-2 px-3.5 pt-3.5 sm:px-6 sm:pt-6 space-y-0">
              <div className="flex flex-col gap-2.5 w-full min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge className={`text-[10px] ${categoryColors[event.category] || 'bg-muted text-muted-foreground'}`}>
                      {event.category}
                    </Badge>
                    {event.recurring && <Badge variant="outline" className="text-[10px]">Recurring</Badge>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="!h-8 !w-8 !rounded-lg text-primary [&_svg]:!size-3.5"
                      onClick={() => setSelectedEventForResponses(event)}
                      title="View Responses"
                    >
                      <Users />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="!h-8 !w-8 !rounded-lg [&_svg]:!size-3.5"
                      onClick={() => openEdit(event)}
                      title="Edit"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="!h-8 !w-8 !rounded-lg text-destructive hover:text-destructive [&_svg]:!size-3.5"
                      onClick={() => handleDeleteClick(event)}
                      title="Delete"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <h3 className="text-base font-semibold leading-snug text-[#1A202C] break-words pr-0">
                  {event.title}
                </h3>
                {/* Audience tags */}
                <div className="flex items-center gap-1 flex-wrap">
                  {(event.targetCampuses ?? ['all']).includes('all') ? (
                    <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600">
                      <Globe className="w-2.5 h-2.5" /> All
                    </Badge>
                  ) : (
                    (event.targetCampuses ?? []).map(id => (
                      <Badge key={id} variant="outline" className="text-[9px] gap-0.5 border-blue-500/30 text-blue-600">
                        <Building2 className="w-2.5 h-2.5" /> {campuses.find(c => c.id === id)?.name || id}
                      </Badge>
                    ))
                  )}
                  {!(event.targetGroups ?? ['all']).includes('all') && (
                    (event.targetGroups ?? []).map(g => (
                      <Badge key={g} variant="outline" className="text-[9px] gap-0.5 border-purple-500/30 text-purple-600">
                        <Users className="w-2.5 h-2.5" /> {g}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-3.5 pb-3.5 sm:px-6 sm:pb-6 flex-1">
              <p className="text-sm text-[#7A6150] line-clamp-3 break-words">{event.description}</p>
              <div className="space-y-2 text-sm text-[#3A2D27]">
                <div className="flex items-start gap-2 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {event.isMultiDay ? (
                    <span className="min-w-0 break-words">
                      {formatDateShort(event.date)} – {formatDateShort(event.endDate || event.date)}
                      <Badge variant="outline" className="ml-2 text-[9px]"> {(event.schedule || []).length} days</Badge>
                    </span>
                  ) : (
                    <span>{formatDateShort(event.date)}</span>
                  )}
                </div>
                {!event.isMultiDay && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="min-w-0 break-words">{formatTime(event.time)} – {formatTime(event.endTime)}</span>
                  </div>
                )}
                {event.isMultiDay && (event.schedule || []).length > 0 && (
                  <div className="pl-5 space-y-0.5">
                    {(event.schedule || []).slice(0, 3).map((day, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground min-w-0">
                        <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="break-words">{formatDateShort(day.date)}: {formatTime(day.startTime)} – {formatTime(day.endTime)}</span>
                        {day.label && <span className="text-primary/70 shrink-0">({day.label})</span>}
                      </div>
                    ))}
                    {(event.schedule || []).length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{(event.schedule || []).length - 3} more days</span>
                    )}
                  </div>
                )}
                {event.recurring && event.nextOccurrence && (
                  <div className="flex items-center gap-2 text-violet-500 min-w-0">
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span className="min-w-0 break-words">Next: {new Date(event.nextOccurrence).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  {(() => {
                    const href = getMapsUrl({
                      mapUrl: event.mapUrl,
                      location: event.location,
                      latitude: event.attendanceConfig?.latitude,
                      longitude: event.attendanceConfig?.longitude,
                    });
                    return href ? (
                      <div className="inline-flex min-w-0 flex-1 max-w-full -space-x-px rounded-lg shadow-sm shadow-black/5 overflow-hidden">
                        <Button
                          asChild
                          variant="outline"
                          className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 !h-8 !px-2.5 !text-xs font-medium border-border/60"
                        >
                          <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0">
                            <span className="truncate block">{event.location}</span>
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 !h-8 !w-8 shrink-0 border-border/60 p-0 [&_img]:!size-[18px]"
                          aria-label="Open directions in Maps"
                        >
                          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
                            <MapsPinIcon className="w-[16px] h-[16px]" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <span className="min-w-0 break-words">{event.location}</span>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-[#E5D5C5]/40">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm">{event.registered} registered</span>
                    {event.attendanceConfig?.enabled && (
                      <span className="text-muted-foreground border-l border-border/50 pl-2 text-sm">
                        {(event as any).attended || 0} attended
                      </span>
                    )}
                  </div>
                  {event.capacity > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">Cap: {event.capacity}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 px-2">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No events found</p>
          <Button onClick={openCreate} className="mt-4 gap-2 w-full sm:w-auto rounded-xl bg-[#8B2323] hover:bg-[#721515] text-white">
            <Plus className="w-4 h-4" /> Create your first event
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">
              {editingId ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: Calendar },
                { id: 'options' as const, label: 'Options', icon: SlidersHorizontal },
                { id: 'audience' as const, label: 'Audience', icon: Users },
                { id: 'form' as const, label: 'Form', icon: ListPlus },
              ]).map((step, idx) => {
                const active = eventFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'options', 'audience', 'form'] as const;
                const done = order.indexOf(eventFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setEventFormStep(step.id)}
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
            {eventFormStep === 'basics' && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#8B2323]" /> Event Details
                </h3>
              <div className="space-y-2">
                <Label className="text-[#3A2D27] font-semibold">Title *</Label>
                <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#3A2D27] font-semibold">Description</Label>
                <Textarea className="rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60 min-h-[88px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the event..." rows={3} />
              </div>
              </div>

              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8B2323]" /> Date & Time
                </h3>
                <div className="space-y-2">
                  <Label className="text-[#3A2D27] font-semibold">{form.isMultiDay ? 'Start Date *' : 'Date *'}</Label>
                  <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>

              {/* Multi-day toggle */}
              <div className="flex items-center gap-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/50 px-3 py-3">
                <Switch checked={form.isMultiDay} onCheckedChange={toggleMultiDay} />
                <div>
                  <Label className="font-semibold text-[#3A2D27]">Multi-day event</Label>
                  <p className="text-[11px] text-[#7A6150]">Build a day-by-day schedule</p>
                </div>
              </div>

              {!form.isMultiDay ? (
                /* Single-day: simple start/end time */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">Start Time *</Label>
                    <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">End Time</Label>
                    <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                  </div>
                </div>
              ) : (
                /* Multi-day: schedule builder */
                <div className="border border-[#E5D5C5]/60 rounded-xl p-4 space-y-3 bg-[#FAF7F2]/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-[#1A202C]">
                      <Calendar className="w-4 h-4 text-[#8B2323]" />
                      Day-by-Day Schedule
                    </h4>
                    <Button type="button" variant="outline" size="sm" className="gap-1 h-8 text-xs rounded-lg border-[#E5D5C5]" onClick={addScheduleDay}>
                      <Plus className="w-3 h-3" /> Add Day
                    </Button>
                  </div>
                  {form.schedule.length === 0 && (
                    <p className="text-xs text-[#7A6150] text-center py-4">No days added yet. Click &quot;Add Day&quot; to build your schedule.</p>
                  )}
                  <div className="space-y-2">
                    {form.schedule.map((day, index) => (
                      <div key={index} className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white border border-[#E5D5C5]/50">
                        <div className="col-span-2 sm:col-span-1 space-y-1">
                          <Label className="text-[10px] text-[#7A6150]">Day {index + 1}</Label>
                          <Input
                            type="date"
                            value={day.date}
                            onChange={(e) => updateScheduleDay(index, { date: e.target.value })}
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1">
                          <Label className="text-[10px] text-[#7A6150]">Label (optional)</Label>
                          <Input
                            value={day.label || ''}
                            onChange={(e) => updateScheduleDay(index, { label: e.target.value })}
                            placeholder="e.g. Opening Day"
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label className="text-[10px] text-[#7A6150]">Start Time</Label>
                          <Input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => updateScheduleDay(index, { startTime: e.target.value })}
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label className="text-[10px] text-[#7A6150]">End Time</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => updateScheduleDay(index, { endTime: e.target.value })}
                              className="h-9 text-xs flex-1 rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => removeScheduleDay(index)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>

              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8B2323]" /> Location
                </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#3A2D27] font-semibold">Location *</Label>
                  <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Grace Central" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#3A2D27] font-semibold">Host *</Label>
                  <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="e.g. Grace Youth" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#3A2D27] font-semibold">Location Google Map URL (optional)</Label>
                <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" value={form.mapUrl || ''} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} placeholder="e.g. https://maps.app.goo.gl/..." />
              </div>
              </div>
            </div>
            )}

            {/* ── Step 2: Options ── */}
            {eventFormStep === 'options' && (
            <div className="space-y-5 max-w-xl mx-auto">
              
              <div className="space-y-3 p-4 rounded-2xl border border-[#E5D5C5]/60 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={form.capacity > 0} 
                    onCheckedChange={(c) => setForm({ ...form, capacity: c ? 100 : 0 })} 
                  />
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 font-semibold text-[#1A202C]">Registration Limit</Label>
                    <p className="text-xs text-[#7A6150]">Restrict the maximum number of people who can register</p>
                  </div>
                </div>
                {form.capacity > 0 && (
                  <div className="pl-12 space-y-2">
                    <Label className="text-xs text-[#7A6150] font-medium">Maximum Capacity</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={form.capacity} 
                      onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} 
                      className="max-w-[200px] h-10 text-sm rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                    />
                  </div>
                )}
              </div>


              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Switch checked={form.recurring} onCheckedChange={(c) => setForm({ ...form, recurring: c })} />
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 font-semibold text-[#1A202C]">
                    <Repeat className="w-4 h-4 text-[#8B2323]" />
                    Recurring Event
                  </Label>
                  <p className="text-xs text-[#7A6150]">Automatically schedule and notify users for repeated events</p>
                </div>
              </div>

              {form.recurring && (
                <div className="border border-[#E5D5C5]/60 bg-[#FAF7F2]/50 rounded-xl p-4 space-y-4">
                  <div className="text-xs text-[#7A6150] bg-white p-2.5 rounded-lg border border-[#E5D5C5]/50 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#8B2323]" />
                    Recurring sequence is based on the Event Start Date: <span className="font-semibold text-[#1A202C]">{form.date || <span className="text-red-500 italic">Not set</span>}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Pattern</Label>
                      <Select
                        value={form.recurrencePattern}
                        onValueChange={(v: any) => setForm({ ...form, recurrencePattern: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <Label className="text-xs text-muted-foreground">Week of Month</Label>
                          <Select value={form.recurrenceWeekOfMonth} onValueChange={(v) => setForm({ ...form, recurrenceWeekOfMonth: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <Label className="text-xs text-muted-foreground">Day of Week</Label>
                          <Select value={form.recurrenceDay} onValueChange={(v) => setForm({ ...form, recurrenceDay: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      value={form.recurrenceEndDate}
                      onChange={(e) => setForm({ ...form, recurrenceEndDate: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Leave empty for indefinite recurring</p>
                  </div>

                  <div className="pt-2">
                    <SchedulePreviewExport
                      title={form.title || 'Untitled Event'}
                      startDate={form.date}
                      endDate={form.recurrenceEndDate}
                      pattern={form.recurrencePattern}
                      dayOfWeek={form.recurrenceDay}
                      weekOfMonth={form.recurrenceWeekOfMonth}
                      startTime={form.time}
                    />
                  </div>
                </div>
              )}
              </div>

              {/* Reminders */}
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-[#1A202C]">
                      <Megaphone className="w-4 h-4 text-[#8B2323]" /> Automated Reminders
                    </h4>
                    <p className="text-xs text-[#7A6150]">Send a push notification before the event starts.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-dashed"
                    onClick={() => setForm(f => ({
                      ...f,
                      customReminders: [...f.customReminders, { daysBefore: 0, hoursBefore: 1, minutesBefore: 0 }]
                    }))}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Reminder
                  </Button>
                </div>
                {form.customReminders.length > 0 && (
                  <div className="space-y-2 pl-1">
                    {form.customReminders.map((rem: any, idx) => (
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

              {/* Geolocation Attendance Config */}
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-[#1A202C]">
                      <MapPin className="w-4 h-4 text-[#8B2323]" /> Geolocation Attendance
                    </h4>
                    <p className="text-xs text-[#7A6150]">Allow members to check-in to this event via GPS.</p>
                  </div>
                  <Switch
                    checked={form.attendanceConfig?.enabled}
                    onCheckedChange={(c) => setForm({ 
                      ...form, 
                      attendanceConfig: { ...form.attendanceConfig, enabled: c as boolean } 
                    })}
                  />
                </div>
                {form.attendanceConfig?.enabled && (
                  <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Latitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={form.attendanceConfig.latitude || ''}
                          onChange={(e) => setForm({
                            ...form,
                            attendanceConfig: { ...form.attendanceConfig, latitude: parseFloat(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Longitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={form.attendanceConfig.longitude || ''}
                          onChange={(e) => setForm({
                            ...form,
                            attendanceConfig: { ...form.attendanceConfig, longitude: parseFloat(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-8 text-xs gap-2"
                      onClick={async () => {
                        if (Capacitor.isNativePlatform()) {
                          try {
                            await Geolocation.requestPermissions();
                          } catch (e) {
                            console.warn("Native location permission request failed", e);
                          }
                        }
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setForm({
                              ...form,
                              attendanceConfig: {
                                ...form.attendanceConfig,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude
                              }
                            }),
                            () => alert("Could not get location.")
                          );
                        }
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5" /> Use My Current Location
                    </Button>
                    <div className="space-y-2">
                      <Label className="text-xs">Check-in Radius (meters)</Label>
                      <Input
                        type="number"
                        value={form.attendanceConfig.radius}
                        onChange={(e) => setForm({
                          ...form,
                          attendanceConfig: { ...form.attendanceConfig, radius: parseInt(e.target.value) || 500 }
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Open (mins before)</Label>
                        <Input
                          type="number"
                          value={form.attendanceConfig.openMinutesBefore}
                          onChange={(e) => setForm({
                            ...form,
                            attendanceConfig: { ...form.attendanceConfig, openMinutesBefore: parseInt(e.target.value) || 30 }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Close (mins after)</Label>
                        <Input
                          type="number"
                          value={form.attendanceConfig.closeMinutesAfter}
                          onChange={(e) => setForm({
                            ...form,
                            attendanceConfig: { ...form.attendanceConfig, closeMinutesAfter: parseInt(e.target.value) || 30 }
                          })}
                        />
                      </div>
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
            {eventFormStep === 'audience' && (
            <div className="space-y-5 max-w-xl mx-auto">

              {/* Audience Targeting */}
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold flex items-center gap-2 text-[#1A202C]">
                  <Megaphone className="w-4 h-4 text-[#8B2323]" /> Audience Targeting
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
                      {getAllowedCampuses(currentUser, campuses, 'events').map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.targetCampuses.includes(c.id)}
                            onCheckedChange={() => toggleCampus(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Campus-scoped FASL / Campus Pastors only target one campus — exclude is N/A */}
                  {!campusLocked && (
                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground">Exclude Campuses (Optional)</Label>
                      <div className="grid grid-cols-1 gap-1.5 pl-2 mt-2">
                        {campuses.map(c => (
                          <label key={`ex-${c.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={form.excludeCampuses.includes(c.id)}
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
                        const selectedCampusIds = campusMode === 'all' ? ['global'] : form.targetCampuses;
                        const visibleGroups = campusMode === 'all'
                          ? groups
                          : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                        return getAllowedGroups(currentUser, groupScopes, 'events')
                          .filter(g => visibleGroups.includes(g))
                          .map(g => (
                          <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox 
                              checked={form.targetGroups.includes(g)} 
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
                        const selectedCampusIds = campusMode === 'all' ? ['global'] : form.targetCampuses;
                        const visibleGroups = campusMode === 'all'
                          ? groups
                          : [...new Set(selectedCampusIds.flatMap(cid => getGroupsForCampus(groupScopes, cid)))];
                        return getAllowedGroups(currentUser, groupScopes, 'events')
                          .filter(g => visibleGroups.includes(g))
                          .map(g => (
                          <label key={`ex-${g}`} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox 
                              checked={form.excludeGroups.includes(g)} 
                              onCheckedChange={() => toggleExcludeGroup(g)} 
                            />
                            {g}
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

              {/* Google Photos Album */}
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-3 shadow-sm">
                <Label className="flex items-center gap-2 font-bold text-[#1A202C]">
                  <ImageIcon className="w-4 h-4 text-[#8B2323]" />
                  Event Photo Album
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
                  <Input
                    value={form.googlePhotosUrl}
                    onChange={(e) => setForm({ ...form, googlePhotosUrl: e.target.value })}
                    placeholder="https://photos.app.goo.gl/..."
                    className="pl-9 h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                  />
                </div>
                <p className="text-xs text-[#7A6150]">Paste a public Google Photos album URL. Members will see a 5-photo preview on the event card.</p>
              </div>
            </div>
            )}

            {/* ── Step 4: Registration Form ── */}
            {eventFormStep === 'form' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="space-y-4 rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 shadow-sm">
                <div>
                  <h4 className="font-bold flex items-center gap-2 text-[#1A202C]">
                    <ListPlus className="w-4 h-4 text-[#8B2323]" />
                    Custom Registration Form
                  </h4>
                  <p className="text-xs text-[#7A6150] mt-1">Design a poll or questionnaire for attendees answering your RSVP.</p>
                </div>

                <div className="flex items-center justify-between p-3 border border-[#E5D5C5]/60 rounded-xl bg-[#FAF7F2]/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-[#1A202C]">Allow Response Edits</Label>
                    <p className="text-xs text-[#7A6150]">If disabled, users can only view their submitted responses.</p>
                  </div>
                  <Switch
                    checked={form.allowResponseEdits !== false} // Default to true if undefined
                    onCheckedChange={(c) => setForm({ ...form, allowResponseEdits: c })}
                  />
                </div>
              </div>

              <div className="space-y-6">
                {(form.formFields || []).map((field, index) => (
                  <div key={field.id} className="p-4 bg-muted/30 rounded-xl relative group border border-border/30 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input 
                          placeholder={`Question ${index + 1}`} 
                          value={field.label} 
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="font-medium bg-background"
                        />
                        <Input 
                          placeholder="Description (optional)" 
                          value={field.description || ''} 
                          onChange={(e) => updateField(field.id, { description: e.target.value })}
                          className="text-xs text-muted-foreground h-8 bg-background/50 border-dashed"
                        />
                      </div>
                      <Select value={field.type} onValueChange={(v: FormFieldType) => updateField(field.id, { type: v })}>
                        <SelectTrigger className="w-[160px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text"><span className="flex items-center gap-2"><AlignLeft className="w-3 h-3"/> Short Answer</span></SelectItem>
                          <SelectItem value="textarea"><span className="flex items-center gap-2"><AlignLeft className="w-3 h-3"/> Paragraph</span></SelectItem>
                          <SelectItem value="radio"><span className="flex items-center gap-2"><Checkbox className="w-3 h-3 rounded-full border-muted-foreground" checked={false}/> Multiple Choice</span></SelectItem>
                          <SelectItem value="checkbox"><span className="flex items-center gap-2"><CheckSquare className="w-3 h-3"/> Checkboxes</span></SelectItem>
                          <SelectItem value="select"><span className="flex items-center gap-2"><ChevronDown className="w-3 h-3"/> Dropdown</span></SelectItem>
                          <SelectItem value="linear_scale"><span className="flex items-center gap-2"><SlidersHorizontal className="w-3 h-3"/> Linear Scale</span></SelectItem>
                          <SelectItem value="date"><span className="flex items-center gap-2"><Calendar className="w-3 h-3"/> Date</span></SelectItem>
                          <SelectItem value="time"><span className="flex items-center gap-2"><Clock className="w-3 h-3"/> Time</span></SelectItem>
                          <SelectItem value="number"><span className="flex items-center gap-2"><Hash className="w-3 h-3"/> Number</span></SelectItem>
                          <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="w-3 h-3"/> Email</span></SelectItem>
                          <SelectItem value="phone"><span className="flex items-center gap-2"><Phone className="w-3 h-3"/> Phone</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options Builder for Choice types */}
                    {['radio', 'checkbox', 'select'].includes(field.type) && (
                      <div className="pl-2 space-y-2 border-l-2 border-primary/20">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            {field.type === 'radio' && <div className="w-3 h-3 rounded-full border border-muted-foreground shrink-0" />}
                            {field.type === 'checkbox' && <div className="w-3 h-3 rounded border border-muted-foreground shrink-0" />}
                            {field.type === 'select' && <span className="text-xs text-muted-foreground shrink-0 w-3 text-right">{optIdx + 1}.</span>}
                            <Input 
                              value={opt.label} 
                              onChange={(e) => updateFieldOption(field.id, opt.id, e.target.value)}
                              className="h-8 text-sm bg-background"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFieldOption(field.id, opt.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="pt-1 flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addFieldOption(field.id)}>
                            <Plus className="w-3 h-3" /> Add Option
                          </Button>
                          {['radio', 'checkbox'].includes(field.type) && !(field.options || []).some(o => o.label === 'Other') && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => addOtherOption(field.id)}>
                              Add "Other"
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Linear Scale Config */}
                    {field.type === 'linear_scale' && (
                      <div className="pl-2 space-y-4 border-l-2 border-primary/20 p-2 bg-background/50 rounded-md">
                        <div className="flex items-center gap-4">
                          <Select value={String(field.scaleMin || 1)} onValueChange={(v) => updateField(field.id, { scaleMin: parseInt(v) })}>
                            <SelectTrigger className="w-[80px] h-8 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground">to</span>
                          <Select value={String(field.scaleMax || 5)} onValueChange={(v) => updateField(field.id, { scaleMax: parseInt(v) })}>
                            <SelectTrigger className="w-[80px] h-8 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: (field.scaleMax || 5) - (field.scaleMin || 1) + 1 }).map((_, i) => {
                            const val = (field.scaleMin || 1) + i;
                            const currentLabel = field.scaleLabels?.[val] || (i === 0 ? field.scaleMinLabel : (i === (field.scaleMax || 5) - (field.scaleMin || 1) ? field.scaleMaxLabel : ''));
                            
                            return (
                              <div key={val} className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground w-4 text-center">{val}</span>
                                <Input 
                                  placeholder="Label (optional)" 
                                  className="h-8 text-sm" 
                                  value={currentLabel || ''} 
                                  onChange={(e) => {
                                    const newScaleLabels = { ...(field.scaleLabels || {}) };
                                    newScaleLabels[val] = e.target.value;
                                    
                                    // For backwards compatibility, still update min/max labels
                                    const updates: any = { scaleLabels: newScaleLabels };
                                    if (i === 0) updates.scaleMinLabel = e.target.value;
                                    if (i === (field.scaleMax || 5) - (field.scaleMin || 1)) updates.scaleMaxLabel = e.target.value;
                                    
                                    updateField(field.id, updates);
                                  }} 
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-4 pt-2 mt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => duplicateField(field.id)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => removeField(field.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`req-${field.id}`} className="text-xs font-medium cursor-pointer">Required</Label>
                        <Switch 
                          id={`req-${field.id}`} 
                          checked={field.required} 
                          onCheckedChange={(c) => updateField(field.id, { required: c })} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full gap-2 border-dashed rounded-xl border-[#E5D5C5] h-11" onClick={addField}>
                <Plus className="w-4 h-4" /> Add Form Field
              </Button>
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
                  const order = ['basics', 'options', 'audience', 'form'] as const;
                  const idx = order.indexOf(eventFormStep);
                  if (idx <= 0) setDialogOpen(false);
                  else setEventFormStep(order[idx - 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                {eventFormStep === 'basics' ? 'Cancel' : 'Back'}
              </Button>
              {eventFormStep !== 'form' && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'options', 'audience', 'form'] as const;
                    const idx = order.indexOf(eventFormStep);
                    setEventFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
              {eventFormStep !== 'form' && (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'options', 'audience', 'form'] as const;
                    const idx = order.indexOf(eventFormStep);
                    setEventFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  handleSubmit();
                }}
              >
                {editingId ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Event Confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this event? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Series Update/Delete Confirm */}
      <Dialog open={!!updateSeriesConfirm} onOpenChange={(open) => !open && setUpdateSeriesConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Recurring Event Series</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">This is a recurring event. Do you want to apply this change to just this specific event, or all upcoming events in the series?</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => confirmSubmitSeries(false)}>
                Just this occurrence
              </Button>
              <Button variant={updateSeriesConfirm?.action === 'delete' ? 'destructive' : 'default'} onClick={() => confirmSubmitSeries(true)}>
                All upcoming events in series
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Responses Confirm */}
      {selectedEventForResponses && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedEventForResponses(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListEnd className="w-5 h-5 text-primary" />
                Responses for {selectedEventForResponses.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              {(() => {
                const allRegs = getEventRegistrations(selectedEventForResponses.id);
                // FASL / Core: only responses from members under this leader
                const regs = isGroupLeader
                  ? allRegs.filter((reg) => {
                      const u = users.find(
                        (x) =>
                          (reg.userId && x.id === reg.userId) ||
                          x.email?.toLowerCase() === reg.userEmail?.toLowerCase()
                      );
                      if (!u) return false;
                      return memberUnderLeaderScope(
                        { campusId: u.campusId, groups: u.groups },
                        {
                          role: currentUser.role,
                          campusId: currentUser.campusId,
                          groups: currentUser.groups,
                        }
                      );
                    })
                  : allRegs;
                if (regs.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListEnd className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No responses recorded yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-muted/60 rounded-[2rem]">
                      <div className="space-y-3">
                        <p className="text-[15px] font-medium text-muted-foreground leading-tight">
                          Total<br />Responses
                        </p>
                        <p className="text-4xl font-bold tracking-tight">{regs.length}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button variant="outline" className="rounded-full bg-background shadow-sm h-11 px-6 font-medium gap-2 border-border/50" onClick={() => handleExportResponsesExcel(selectedEventForResponses, regs)}>
                          <Download className="w-4 h-4" /> Export Excel
                        </Button>
                        <Button variant="outline" className="rounded-full bg-background shadow-sm h-11 px-6 font-medium gap-2 border-border/50" onClick={() => handleExportResponsesPDF(selectedEventForResponses, regs)}>
                          <FileText className="w-4 h-4" /> Export PDF
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-xl divide-y">
                      {regs.map(reg => (
                        <div key={reg.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{reg.userName}</p>
                              <p className="text-xs text-muted-foreground">{reg.userEmail} · {new Date(reg.registeredAt).toLocaleString()}</p>
                            </div>
                          </div>
                          {Object.keys(reg.responses).length > 0 && (
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                              {selectedEventForResponses.formFields?.map(field => {
                                const answer = reg.responses[field.id];
                                if (!answer) return null;
                                return (
                                  <div key={field.id} className="text-sm">
                                    <span className="font-medium text-muted-foreground">{field.label}: </span>
                                    <span>{Array.isArray(answer) ? answer.join(', ') : answer}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
