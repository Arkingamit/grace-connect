"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Plus, Trash2, Users, RefreshCw, Repeat, Calendar, Download, FileSpreadsheet, PieChart, QrCode, MessageCircle, Send, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight, SlidersHorizontal, MoreVertical, Megaphone, FileText, Camera } from 'lucide-react';
import { SchedulePreviewExport } from '@/components/admin/schedule-preview-export';
import {
  useAdminData,
  getGroupsForCampus,
  getAllowedCampuses,
  getAllowedGroups,
  hasGlobalScope,
  isCoreTeamLeader,
  isFasLeader,
} from '@/lib/admin-data-context';
import { CompactStackedList, mapUsersToStackedMembers } from '@/components/ui/stacked-list';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChoiceboxGroup } from '@/components/ui/choicebox-1';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveJsPdf } from '@/lib/save-image';
import * as XLSX from 'xlsx';

const DEFAULT_ABSENT_MESSAGE = 'We missed you at church today! Hope you are doing well.';

const emptySessionForm = (campusId: string) => ({
  title: '',
  campusId,
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '11:00',
  latitude: 0,
  longitude: 0,
  radius: 300,
  recurring: false,
  recurrencePattern: 'weekly',
  recurrenceDay: 'Sunday',
  recurrenceWeekOfMonth: '1st',
  recurrenceEndDate: '',
  targetCampuses: ['all'] as string[],
  targetGroups: ['all'] as string[],
  excludeCampuses: [] as string[],
  excludeGroups: [] as string[],
  checkInConfig: {
    selfCheckInEnabled: true,
    selfCheckInRequireGps: true,
    scannerEnabled: true,
    scannerRequireGps: false,
  },
  assignedScannerIds: [] as string[],
});

export default function AdminAttendancePage() {
  const { campuses, groups, groupScopes, currentUser, users } = useAdminData();
  const isCampusLeader = currentUser?.role === 'campus_leader';
  const isGroupLeader = currentUser?.role === 'group_leader';
  const isCore = isCoreTeamLeader(currentUser?.role || '', currentUser?.campusId);
  const isFas = isFasLeader(currentUser?.role || '', currentUser?.campusId);
  const campusLocked = isCampusLeader || isFas;
  const canAllCampusesScope = hasGlobalScope(currentUser, 'attendance');
  const canManageSessions = !isGroupLeader;
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionFormStep, setSessionFormStep] = useState<'basics' | 'checkin' | 'audience'>('basics');
  const [showBroadcastList, setShowBroadcastList] = useState(false);
  const [scannerSearch, setScannerSearch] = useState('');
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [selectedSessionRecords, setSelectedSessionRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [activeRecordsTab, setActiveRecordsTab] = useState('insights');
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultAbsentMessage, setDefaultAbsentMessage] = useState(DEFAULT_ABSENT_MESSAGE);
  const [messageText, setMessageText] = useState<{ [key: string]: string }>({});
  const [sendingMessage, setSendingMessage] = useState<{ [key: string]: boolean }>({});
  const [updatingStatus, setUpdatingStatus] = useState<{ [key: string]: boolean }>({});
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [membersSubTab, setMembersSubTab] = useState('undetected');
  const [bulkSending, setBulkSending] = useState(false);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSessionForQr, setSelectedSessionForQr] = useState<any>(null);

  // Track which session ID we're currently viewing records for
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  const [form, setForm] = useState(() =>
    emptySessionForm(currentUser?.campusId || 'main')
  );

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/attendance-sessions');
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/attendance-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success("Attendance session created");
        setDialogOpen(false);
        fetchSessions();
      } else {
        toast.error("Failed to create session");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      const res = await fetch(`/api/admin/attendance-sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Session deleted");
        fetchSessions();
      } else {
        toast.error("Failed to delete");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const viewRecords = async (sessionId: string) => {
    setRecordsDialogOpen(true);
    setLoadingRecords(true);
    setViewingSessionId(sessionId);
    setSelectedMemberIds([]);
    setMultiSelectMode(false);
    setMembersSubTab('undetected');
    setExpandedMessageId(null);
    try {
      const res = await fetch(`/api/admin/attendance-records?sessionId=${sessionId}`);
      if (res.ok) {
        setSelectedSessionRecords(await res.json());
      }
    } catch (e) {
      toast.error("Failed to load records");
    }
    setLoadingRecords(false);
  };

  const handleBulkSendAndMarkAbsent = async () => {
    if (!viewingSessionId) return;
    if (selectedMemberIds.length === 0) {
      toast.error('Select at least one member');
      return;
    }
    const text = defaultAbsentMessage.trim();
    if (!text) {
      toast.error('Please enter a default follow-up message');
      return;
    }
    try {
      setBulkSending(true);
      const res = await fetch('/api/admin/attendance-records/bulk-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: viewingSessionId,
          userIds: selectedMemberIds,
          message: text,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(
        `Message sent to ${data.sent || selectedMemberIds.length} member(s) — marked absent`
      );
      setSelectedMemberIds([]);
      setMultiSelectMode(false);
      setExpandedMessageId(null);
      await viewRecords(viewingSessionId);
    } catch {
      toast.error('Failed to send bulk follow-up');
    } finally {
      setBulkSending(false);
    }
  };

  const handleMarkAttendance = async (userId: string, status: string) => {
    if (!viewingSessionId) return;
    try {
      setUpdatingStatus(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/admin/attendance-records/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: viewingSessionId, userId, status }),
      });
      if (res.ok) {
        toast.success(`Marked as ${status}`);
        // Refresh records for the selected session to update UI
        viewRecords(viewingSessionId);
      } else {
        throw new Error('Failed to mark');
      }
    } catch (e) {
      toast.error('Error marking attendance');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getMemberMessage = (userId: string) => {
    const custom = messageText[userId];
    if (custom !== undefined) return custom;
    return defaultAbsentMessage;
  };

  const handleSendMessage = async (userId: string) => {
    if (!viewingSessionId) return;
    const text = getMemberMessage(userId).trim();
    if (!text) {
      toast.error('Please enter a message');
      return;
    }
    try {
      setSendingMessage(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/admin/attendance-records/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text, sessionId: viewingSessionId }),
      });
      if (res.ok) {
        toast.success('Message sent successfully!');
      } else {
        throw new Error('Failed to send');
      }
    } catch (e) {
      toast.error('Error sending message');
    } finally {
      setSendingMessage(prev => ({ ...prev, [userId]: false }));
    }
  };

  const openWhatsApp = (whatsapp?: string, userId?: string) => {
    if (!whatsapp) return;
    const text = (userId ? getMemberMessage(userId) : defaultAbsentMessage).trim();
    if (!text) {
      toast.error('Please enter a message');
      return;
    }
    const encoded = encodeURIComponent(text);
    const number = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
  };

  const getCurrentLocation = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Geolocation.requestPermissions();
      } catch (e) {
        console.warn("Native location permission request failed", e);
      }
    }
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        toast.success("Location updated");
      },
      (error) => {
        toast.error("Failed to get location. Please ensure location services are enabled.");
      }
    );
  };

  const openCreate = () => {
    const campusId = currentUser?.campusId || 'main';
    const next = emptySessionForm(campusId);
    if (campusLocked) {
      next.targetCampuses = [campusId];
      next.campusId = campusId;
    }
    if (isFas) {
      next.targetGroups = [...(currentUser?.groups || [])];
    }
    setForm(next);
    setSessionFormStep('basics');
    setShowBroadcastList(false);
    setScannerSearch('');
    setDialogOpen(true);
  };

  // ── Audience helpers (same pattern as events / announcements) ──
  const campusMode = form.targetCampuses.includes('all') ? 'all' : 'specific';
  const groupMode = isFas
    ? 'specific'
    : (form.targetGroups.includes('all') ||
      (isGroupLeader &&
        form.targetGroups.length === (currentUser?.groups?.length || 0) &&
        (currentUser?.groups?.length || 0) > 0)
      ? 'all'
      : 'specific');

  const setCampusMode = (mode: 'all' | 'specific') => {
    if (campusLocked) return;
    setForm((f) => ({
      ...f,
      targetCampuses: mode === 'specific' ? [] : ['all'],
    }));
  };

  const toggleCampus = (campusId: string) => {
    if (campusLocked) return;
    setForm((f) => {
      const has = f.targetCampuses.includes(campusId);
      const next = has
        ? f.targetCampuses.filter((c) => c !== campusId)
        : [...f.targetCampuses.filter((c) => c !== 'all'), campusId];
      return { ...f, targetCampuses: next.length === 0 ? ['all'] : next };
    });
  };

  const toggleExcludeCampus = (campusId: string) => {
    if (campusLocked) return;
    setForm((f) => {
      const has = f.excludeCampuses.includes(campusId);
      const next = has
        ? f.excludeCampuses.filter((c) => c !== campusId)
        : [...f.excludeCampuses, campusId];
      return { ...f, excludeCampuses: next };
    });
  };

  const setGroupMode = (mode: 'all' | 'specific') => {
    if (isFas) return;
    setForm((f) => {
      let nextTarget = ['all'];
      if (isGroupLeader) {
        nextTarget = mode === 'specific' ? [] : [...(currentUser?.groups || [])];
      } else if (mode === 'specific') {
        nextTarget = [];
      }
      return { ...f, targetGroups: nextTarget };
    });
  };

  const toggleGroup = (group: string) => {
    setForm((f) => {
      const has = f.targetGroups.includes(group);
      const next = has
        ? f.targetGroups.filter((g) => g !== group)
        : [...f.targetGroups.filter((g) => g !== 'all'), group];
      if (next.length === 0) {
        return {
          ...f,
          targetGroups: isFas
            ? []
            : isGroupLeader
              ? [...(currentUser?.groups || [])]
              : ['all'],
        };
      }
      return { ...f, targetGroups: next };
    });
  };

  const toggleExcludeGroup = (group: string) => {
    setForm((f) => {
      const has = f.excludeGroups.includes(group);
      const next = has
        ? f.excludeGroups.filter((g) => g !== group)
        : [...f.excludeGroups, group];
      return { ...f, excludeGroups: next };
    });
  };

  const handleExportPDF = (broadcastUsers: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Broadcast Audience List', 14, 15);
    doc.setFontSize(10);
    doc.text(form.title || 'Attendance Session', 14, 22);
    const tableData = broadcastUsers.map((u) => [
      u.name || '',
      campuses.find((c) => c.id === u.campusId)?.name || u.campusId || '',
      (u.groups || []).join(', '),
    ]);
    autoTable(doc, {
      startY: 28,
      head: [['Name', 'Campus', 'Groups']],
      body: tableData,
    });
    void saveJsPdf(doc, `attendance-audience-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exported successfully');
  };

  const handleExportExcel = (broadcastUsers: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(
      broadcastUsers.map((u) => ({
        Name: u.name || '',
        Campus: campuses.find((c) => c.id === u.campusId)?.name || u.campusId || '',
        Groups: (u.groups || []).join(', '),
        Email: u.email || '',
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
    XLSX.writeFile(workbook, `attendance-audience-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exported successfully');
  };

  const sessionAudienceLabel = (s: any) => {
    const tc: string[] =
      Array.isArray(s.targetCampuses) && s.targetCampuses.length > 0
        ? s.targetCampuses
        : s.campusId === 'all'
          ? ['all']
          : [s.campusId];
    if (tc.includes('all')) return 'All Campuses';
    return tc.map((id) => campuses.find((c: any) => c.id === id)?.name || id).join(', ');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A202C]">Attendance Tracking</h1>
          <p className="text-muted-foreground mt-1">
            {isGroupLeader
              ? 'View attendance for members in your assigned groups'
              : 'Configure geolocation attendance sessions'}
          </p>
        </div>
        {canManageSessions && (
          <Button onClick={openCreate} className="bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Session
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
          <p className="text-muted-foreground mb-4">
            {isGroupLeader
              ? 'No attendance sessions are available for your campus yet.'
              : 'Create an attendance session to allow members to check in.'}
          </p>
          {canManageSessions && (
            <Button onClick={openCreate} variant="outline">Create Session</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(s => (
            <Card key={s._id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {s.title}
                      {s.recurring && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Repeat className="w-3 h-3" /> Recurring</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {s.recurring ? `Starts ${s.date}` : s.date} • {s.startTime} - {s.endTime}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campus:</span>
                    <span className="font-medium">
                      {sessionAudienceLabel(s)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Radius:</span>
                    <span className="font-medium">{s.radius} meters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-medium truncate max-w-[120px]">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scanners:</span>
                    <span className="font-medium">
                      {Array.isArray(s.assignedScannerIds) && s.assignedScannerIds.length > 0
                        ? `${s.assignedScannerIds.length} assigned`
                        : 'All leaders'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-2 pt-2 border-t">
                  <Button variant="outline" className="w-full sm:flex-1" onClick={() => viewRecords(s._id)}>
                    <Users className="w-4 h-4 sm:mr-2 mr-1 shrink-0" /> <span className="truncate text-xs sm:text-sm">Records</span>
                  </Button>
                  {canManageSessions && (
                    <>
                      <Button variant="outline" className="w-full sm:flex-1" onClick={() => { setSelectedSessionForQr(s); setQrDialogOpen(true); }}>
                        <QrCode className="w-4 h-4 sm:mr-2 mr-1 shrink-0" /> <span className="truncate text-xs sm:text-sm">Show QR</span>
                      </Button>
                      <Button variant="outline" className="col-span-2 w-full sm:w-auto sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(s._id)}>
                        <Trash2 className="w-4 h-4 sm:mr-0 mr-2 shrink-0" /> <span className="sm:hidden text-xs">Delete Session</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-auto max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#FAF7F2] border-[#E5D5C5] rounded-[24px]">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-4 bg-[#FAF7F2]">
            <DialogTitle className="font-serif text-xl text-[#1A202C]">Create Attendance Session</DialogTitle>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {([
                { id: 'basics' as const, label: 'Basics', icon: Calendar },
                { id: 'checkin' as const, label: 'Check-in', icon: SlidersHorizontal },
                { id: 'audience' as const, label: 'Audience', icon: Users },
              ]).map((step, idx) => {
                const active = sessionFormStep === step.id;
                const Icon = step.icon;
                const order = ['basics', 'checkin', 'audience'] as const;
                const done = order.indexOf(sessionFormStep) > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSessionFormStep(step.id)}
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

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#FAF7F2]">
            {sessionFormStep === 'basics' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8B2323]" /> Session Details
                  </h3>
                  <div className="space-y-2">
                    <Label className="text-[#3A2D27] font-semibold">Session Title</Label>
                    <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunday Service - Main Campus" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#3A2D27] font-semibold">{form.recurring ? 'Start Date' : 'Date'}</Label>
                      <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#3A2D27] font-semibold">Radius (meters)</Label>
                      <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="number" min={10} max={300} value={form.radius} onChange={e => setForm({ ...form, radius: parseInt(e.target.value) || 0 })} onBlur={() => setForm({ ...form, radius: Math.min(300, Math.max(10, form.radius)) })} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.recurring} onCheckedChange={(c) => setForm({ ...form, recurring: c })} />
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 font-semibold text-[#1A202C]">
                        <Repeat className="w-4 h-4 text-[#8B2323]" />
                        Recurring Session
                      </Label>
                      <p className="text-xs text-[#7A6150]">Automatically schedule repeated attendance sessions</p>
                    </div>
                  </div>

                  {form.recurring && (
                    <div className="border border-[#E5D5C5]/60 bg-[#FAF7F2]/50 rounded-xl p-4 space-y-4">
                      <div className="text-xs text-[#7A6150] bg-white p-2.5 rounded-lg border border-[#E5D5C5]/50 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#8B2323]" />
                        Recurring sequence is based on the Session Start Date: <span className="font-semibold text-[#1A202C]">{form.date || <span className="text-red-500 italic">Not set</span>}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Pattern</Label>
                          <Select value={form.recurrencePattern} onValueChange={(v) => setForm({ ...form, recurrencePattern: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Every Week</SelectItem>
                              <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                              <SelectItem value="monthly">Every Month</SelectItem>
                              <SelectItem value="custom_monthly">Custom Monthly (e.g. 1st Sunday)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(form.recurrencePattern === 'weekly' || form.recurrencePattern === 'biweekly' || form.recurrencePattern === 'custom_monthly') && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Day of Week</Label>
                            <Select value={form.recurrenceDay} onValueChange={(v) => setForm({ ...form, recurrenceDay: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {form.recurrencePattern === 'custom_monthly' && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Week of Month</Label>
                            <Select value={form.recurrenceWeekOfMonth} onValueChange={(v) => setForm({ ...form, recurrenceWeekOfMonth: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1st">First</SelectItem>
                                <SelectItem value="2nd">Second</SelectItem>
                                <SelectItem value="3rd">Third</SelectItem>
                                <SelectItem value="4th">Fourth</SelectItem>
                                <SelectItem value="last">Last</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Until (Optional)</Label>
                        <Input type="date" className="h-8 text-xs" value={form.recurrenceEndDate} onChange={e => setForm({ ...form, recurrenceEndDate: e.target.value })} />
                      </div>
                      <div className="pt-2">
                        <SchedulePreviewExport
                          title={form.title || 'Untitled Session'}
                          startDate={form.date}
                          endDate={form.recurrenceEndDate}
                          pattern={form.recurrencePattern}
                          dayOfWeek={form.recurrenceDay}
                          weekOfMonth={form.recurrenceWeekOfMonth}
                          startTime={form.startTime}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8B2323]" /> Time & Location
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#3A2D27] font-semibold">Start Time</Label>
                      <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#3A2D27] font-semibold">End Time</Label>
                      <Input className="h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="p-4 bg-[#FAF7F2]/50 rounded-xl space-y-3 border border-[#E5D5C5]/60">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold text-[#1A202C]">Location Coordinates</Label>
                      <Button size="sm" variant="secondary" className="rounded-lg" onClick={getCurrentLocation}>
                        <MapPin className="w-3 h-3 mr-1" /> Use My Location
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-[#7A6150]">Latitude</Label>
                        <Input className="rounded-lg bg-white border-[#E5D5C5]/60" type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-[#7A6150]">Longitude</Label>
                        <Input className="rounded-lg bg-white border-[#E5D5C5]/60" type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <p className="text-xs text-[#7A6150]">You can also copy/paste coordinates from Google Maps (Right-click a location to copy).</p>
                  </div>
                </div>
              </div>
            )}

            {sessionFormStep === 'checkin' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#8B2323]" /> Check-in Configuration
                  </h3>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-[#1A202C]">Allow Self Check-in</Label>
                        <p className="text-[10px] text-[#7A6150]">Members can check in from their app</p>
                      </div>
                      <Switch checked={form.checkInConfig.selfCheckInEnabled} onCheckedChange={(c) => setForm({ ...form, checkInConfig: { ...form.checkInConfig, selfCheckInEnabled: c } })} />
                    </div>
                    {form.checkInConfig.selfCheckInEnabled && (
                      <div className="flex items-center justify-between pl-4 border-l-2 border-[#E5D5C5]">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold text-[#1A202C]">Require GPS for Self Check-in</Label>
                          <p className="text-[10px] text-[#7A6150]">User must be within radius</p>
                        </div>
                        <Switch checked={form.checkInConfig.selfCheckInRequireGps} onCheckedChange={(c) => setForm({ ...form, checkInConfig: { ...form.checkInConfig, selfCheckInRequireGps: c } })} />
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-[#E5D5C5]/60 pt-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-[#1A202C]">Allow Scanner</Label>
                        <p className="text-[10px] text-[#7A6150]">Leaders / assigned users can scan member ePasses</p>
                      </div>
                      <Switch checked={form.checkInConfig.scannerEnabled} onCheckedChange={(c) => setForm({ ...form, checkInConfig: { ...form.checkInConfig, scannerEnabled: c } })} />
                    </div>
                    {form.checkInConfig.scannerEnabled && (
                      <div className="flex items-center justify-between pl-4 border-l-2 border-[#E5D5C5]">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold text-[#1A202C]">Verify Leader GPS</Label>
                          <p className="text-[10px] text-[#7A6150]">Scanner must be in radius when scanning</p>
                        </div>
                        <Switch checked={form.checkInConfig.scannerRequireGps} onCheckedChange={(c) => setForm({ ...form, checkInConfig: { ...form.checkInConfig, scannerRequireGps: c } })} />
                      </div>
                    )}
                  </div>
                </div>

                {form.checkInConfig.scannerEnabled && (
                  <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#8B2323]" /> Assign ePass Scanners
                      </h3>
                      <p className="text-xs text-[#7A6150]">
                        Choose who can scan ePasses for this session. Leave empty to allow all leaders.
                      </p>
                    </div>

                    {form.assignedScannerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.assignedScannerIds.map((id) => {
                          const u = users.find((x) => x.id === id);
                          if (!u) return null;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  assignedScannerIds: f.assignedScannerIds.filter((x) => x !== id),
                                }))
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-[#FBE8E8] text-[#8B2323] px-2.5 py-1 text-[11px] font-semibold border border-[#E5C5C5]"
                            >
                              {u.name}
                              <XCircle className="w-3 h-3 opacity-70" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A6150]" />
                      <Input
                        value={scannerSearch}
                        onChange={(e) => setScannerSearch(e.target.value)}
                        placeholder="Search members to assign…"
                        className="h-10 pl-9 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E5D5C5]/60 divide-y divide-[#E5D5C5]/40">
                      {(() => {
                        const q = scannerSearch.trim().toLowerCase();
                        const eligible = users
                          .filter((u) => {
                            if ((u as any).status && (u as any).status !== 'approved') return false;
                            const tc = form.targetCampuses?.length ? form.targetCampuses : ['all'];
                            if (!tc.includes('all') && !tc.includes(u.campusId)) return false;
                            if (!q) return true;
                            return (
                              u.name?.toLowerCase().includes(q) ||
                              u.email?.toLowerCase().includes(q) ||
                              (u.groups || []).some((g) => g.toLowerCase().includes(q))
                            );
                          })
                          .slice(0, 80);

                        if (eligible.length === 0) {
                          return (
                            <p className="text-xs text-[#7A6150] p-3 text-center">No matching members</p>
                          );
                        }

                        return eligible.map((u) => {
                          const checked = form.assignedScannerIds.includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#FAF7F2]/80"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => {
                                  setForm((f) => {
                                    const has = f.assignedScannerIds.includes(u.id);
                                    return {
                                      ...f,
                                      assignedScannerIds: has
                                        ? f.assignedScannerIds.filter((x) => x !== u.id)
                                        : [...f.assignedScannerIds, u.id],
                                    };
                                  });
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#1A202C] truncate">{u.name}</p>
                                <p className="text-[10px] text-[#7A6150] truncate">
                                  {campuses.find((c) => c.id === u.campusId)?.name || u.campusId}
                                  {u.role ? ` · ${u.role.replace('_', ' ')}` : ''}
                                </p>
                              </div>
                            </label>
                          );
                        });
                      })()}
                    </div>

                    <p className="text-[10px] text-[#7A6150]">
                      {form.assignedScannerIds.length === 0
                        ? 'No one assigned — all leaders can scan for this session.'
                        : `${form.assignedScannerIds.length} scanner${form.assignedScannerIds.length === 1 ? '' : 's'} assigned.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {sessionFormStep === 'audience' && (
              <div className="space-y-5 max-w-xl mx-auto">
                <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A202C] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B2323]" />
                    Audience Targeting
                  </h3>

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
                        {getAllowedCampuses(currentUser, campuses, 'attendance').map(campus => (
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
                          return getAllowedGroups(currentUser, groupScopes, 'attendance')
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
                  const order = ['basics', 'checkin', 'audience'] as const;
                  const idx = order.indexOf(sessionFormStep);
                  if (idx <= 0) setDialogOpen(false);
                  else setSessionFormStep(order[idx - 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 mr-1" />
                {sessionFormStep === 'basics' ? 'Cancel' : 'Back'}
              </Button>
              {sessionFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] flex-1 sm:flex-none min-w-0 sm:hidden focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'checkin', 'audience'] as const;
                    const idx = order.indexOf(sessionFormStep);
                    setSessionFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 shrink-0 ml-1" />
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2 order-2">
              {sessionFormStep !== 'audience' && (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:inline-flex rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    const order = ['basics', 'checkin', 'audience'] as const;
                    const idx = order.indexOf(sessionFormStep);
                    setSessionFormStep(order[Math.min(idx + 1, order.length - 1)]);
                  }}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button
                className="rounded-xl bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  handleSave();
                }}
              >
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Records Dialog with Insights & Export */}
      <Dialog open={recordsDialogOpen} onOpenChange={(open) => {
        setRecordsDialogOpen(open);
        if (!open) {
          setExpandedMessageId(null);
          setSelectedMemberIds([]);
          setMultiSelectMode(false);
          setMembersSubTab('undetected');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#FAF7F2] border-[#E5D5C5]">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#E5D5C5]/60 shrink-0 space-y-1">
            <DialogTitle className="font-serif text-xl text-[#1A202C] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#8B2323]" /> Attendance
            </DialogTitle>
            <p className="text-sm text-[#7A6150] font-normal">Review who checked in, mark status, and follow up with members.</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {loadingRecords ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-[#7A6150]" /></div>
            ) : selectedSessionRecords.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users className="w-10 h-10 mx-auto text-[#E5D5C5]" />
                <p className="text-[#3A2D27] font-semibold">No members yet</p>
                <p className="text-sm text-[#7A6150]">No one has checked in for this session.</p>
              </div>
            ) : (
              <Tabs defaultValue="insights" value={activeRecordsTab} onValueChange={setActiveRecordsTab} className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2 h-auto p-1 bg-[#F3EAE1] rounded-xl border border-[#E5D5C5]/60">
                  <TabsTrigger
                    value="insights"
                    className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-[#8B2323] data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <PieChart className="w-4 h-4" /> Summary
                  </TabsTrigger>
                  <TabsTrigger
                    value="directory"
                    className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-[#8B2323] data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <Users className="w-4 h-4" /> Members
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="insights">
                  {(() => {
                    const allRecords = selectedSessionRecords;
                    const records = allRecords.filter((r: any) => r.status !== 'absent' && r.status !== 'unmarked');
                    const absentRecords = allRecords.filter((r: any) => r.status === 'absent');
                    const unmarkedRecords = allRecords.filter((r: any) => r.status === 'unmarked');
                    const total = records.length;
                    const totalAbsent = absentRecords.length;
                    const totalUnmarked = unmarkedRecords.length;
                    const now = new Date();

                    // Gender breakdown (present)
                    const males = records.filter((r: any) => r.user.gender === 'male').length;
                    const females = records.filter((r: any) => r.user.gender === 'female').length;

                    // Absent gender
                    const absentMales = absentRecords.filter((r: any) => r.user.gender === 'male').length;
                    const absentFemales = absentRecords.filter((r: any) => r.user.gender === 'female').length;

                    // Marital status (present)
                    const married = records.filter((r: any) => r.user.maritalStatus === 'married').length;
                    const single = records.filter((r: any) => r.user.maritalStatus === 'single').length;

                    // Age group calculations (present)
                    const ageGroups = { 'Under 18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '65+': 0, 'Unknown': 0 };
                    records.forEach((r: any) => {
                      if (!r.user.birthday) { ageGroups['Unknown']++; return; }
                      const birth = new Date(r.user.birthday);
                      const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      if (age < 18) ageGroups['Under 18']++;
                      else if (age <= 25) ageGroups['18-25']++;
                      else if (age <= 35) ageGroups['26-35']++;
                      else if (age <= 50) ageGroups['36-50']++;
                      else if (age <= 65) ageGroups['51-65']++;
                      else ageGroups['65+']++;
                    });

                    // Absent age groups
                    const absentAgeGroups = { 'Under 18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '65+': 0, 'Unknown': 0 };
                    absentRecords.forEach((r: any) => {
                      if (!r.user.birthday) { absentAgeGroups['Unknown']++; return; }
                      const birth = new Date(r.user.birthday);
                      const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      if (age < 18) absentAgeGroups['Under 18']++;
                      else if (age <= 25) absentAgeGroups['18-25']++;
                      else if (age <= 35) absentAgeGroups['26-35']++;
                      else if (age <= 50) absentAgeGroups['36-50']++;
                      else if (age <= 65) absentAgeGroups['51-65']++;
                      else absentAgeGroups['65+']++;
                    });

                    // Families (users who share a familyMemberId) — present
                    const familyIds = records
                      .map((r: any) => r.user.familyMemberId)
                      .filter(Boolean);
                    const uniqueFamilies = new Set(familyIds.map(String)).size;

                    return (
                      <div className="space-y-4">
                        {/* Top stats row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-white border border-[#E5D5C5]/60 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#1A202C]">{total}</p>
                            <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Total Present</p>
                          </div>
                          <div className="bg-[#FBE8E8] border border-[#E8D5D5] rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#8B2323]">{totalAbsent}</p>
                            <p className="text-[10px] font-semibold text-[#8B2323] uppercase tracking-wider">Total Absent</p>
                          </div>
                          <div className="bg-white border border-[#E5D5C5]/60 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#7A6150]">{totalUnmarked}</p>
                            <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Not marked</p>
                          </div>
                          <div className="bg-white border border-[#E5D5C5]/60 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#5C4535]">{married}</p>
                            <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Married</p>
                          </div>
                          <div className="bg-white border border-[#E5D5C5]/60 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#3A2D27]">{single}</p>
                            <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Single</p>
                          </div>
                          <div className="bg-[#FBE8E8]/70 border border-[#E8D5D5] rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-[#8B2323]">{uniqueFamilies}</p>
                            <p className="text-[10px] font-semibold text-[#8B2323] uppercase tracking-wider">Families</p>
                          </div>
                        </div>

                        {/* Gender + Age breakdown (present) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Gender */}
                          <div className="border border-[#E5D5C5]/60 rounded-2xl p-4 bg-white shadow-sm">
                            <h4 className="text-xs font-bold text-[#7A6150] uppercase mb-3">Gender (Present)</h4>
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1 text-[#3A2D27]"><span>Male</span><span className="font-bold">{males}</span></div>
                                <div className="w-full bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#5C4535] h-2 rounded-full" style={{ width: `${total ? (males / total) * 100 : 0}%` }} /></div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1 text-[#3A2D27]"><span>Female</span><span className="font-bold">{females}</span></div>
                                <div className="w-full bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#8B2323] h-2 rounded-full" style={{ width: `${total ? (females / total) * 100 : 0}%` }} /></div>
                              </div>
                            </div>
                          </div>

                          {/* Age Groups */}
                          <div className="border border-[#E5D5C5]/60 rounded-2xl p-4 bg-white shadow-sm">
                            <h4 className="text-xs font-bold text-[#7A6150] uppercase mb-3">Age Groups (Present)</h4>
                            <div className="space-y-1.5">
                              {Object.entries(ageGroups).filter(([, v]) => v > 0).map(([label, count]) => (
                                <div key={label} className="flex items-center gap-2 text-xs">
                                  <span className="w-16 text-[#7A6150]">{label}</span>
                                  <div className="flex-1 bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#7A6150] h-2 rounded-full transition-all" style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div>
                                  <span className="w-6 text-right font-bold text-[#3A2D27]">{count}</span>
                                </div>
                              ))}
                              {total === 0 && (
                                <p className="text-xs text-[#7A6150]">No present members yet.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Absent breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-[#E8D5D5] rounded-2xl p-4 bg-[#FBE8E8]/40 shadow-sm">
                            <h4 className="text-xs font-bold text-[#8B2323] uppercase mb-3">Gender (Absent)</h4>
                            {totalAbsent === 0 ? (
                              <p className="text-xs text-[#7A6150]">No absent members marked.</p>
                            ) : (
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm mb-1 text-[#3A2D27]"><span>Male</span><span className="font-bold">{absentMales}</span></div>
                                  <div className="w-full bg-white/80 rounded-full h-2"><div className="bg-[#5C4535] h-2 rounded-full" style={{ width: `${totalAbsent ? (absentMales / totalAbsent) * 100 : 0}%` }} /></div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm mb-1 text-[#3A2D27]"><span>Female</span><span className="font-bold">{absentFemales}</span></div>
                                  <div className="w-full bg-white/80 rounded-full h-2"><div className="bg-[#8B2323] h-2 rounded-full" style={{ width: `${totalAbsent ? (absentFemales / totalAbsent) * 100 : 0}%` }} /></div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="border border-[#E8D5D5] rounded-2xl p-4 bg-[#FBE8E8]/40 shadow-sm">
                            <h4 className="text-xs font-bold text-[#8B2323] uppercase mb-3">Age Groups (Absent)</h4>
                            <div className="space-y-1.5">
                              {totalAbsent === 0 ? (
                                <p className="text-xs text-[#7A6150]">No absent members marked.</p>
                              ) : (
                                Object.entries(absentAgeGroups).filter(([, v]) => v > 0).map(([label, count]) => (
                                  <div key={label} className="flex items-center gap-2 text-xs">
                                    <span className="w-16 text-[#7A6150]">{label}</span>
                                    <div className="flex-1 bg-white/80 rounded-full h-2"><div className="bg-[#8B2323] h-2 rounded-full transition-all" style={{ width: `${totalAbsent ? (count / totalAbsent) * 100 : 0}%` }} /></div>
                                    <span className="w-6 text-right font-bold text-[#3A2D27]">{count}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button variant="outline" className="flex-1 rounded-xl border-[#E5D5C5] text-[#3A2D27] hover:bg-[#F3EAE1]" onClick={() => {
                            const headers = ['Name', 'Email', 'Status', 'Gender', 'Age', 'Marital Status', 'Distance (m)', 'Time'];
                            const rows = allRecords.map((r: any) => {
                              let age = '';
                              if (r.user.birthday) {
                                const birth = new Date(r.user.birthday);
                                age = String(Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                              }
                              return [
                                r.user.name,
                                r.user.email,
                                r.status || '',
                                r.user.gender || '',
                                age,
                                r.user.maritalStatus || '',
                                r.distance ?? '',
                                r.markedAt ? new Date(r.markedAt).toLocaleString() : ''
                              ].map(v => `"${v}"`).join(',');
                            });
                            const csv = [headers.join(','), ...rows].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            toast.success('Excel (CSV) exported!');
                          }}>
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Export Excel
                          </Button>
                          <Button variant="outline" className="flex-1 rounded-xl border-[#E5D5C5] text-[#3A2D27] hover:bg-[#F3EAE1]" onClick={() => {
                            const printWin = window.open('', '_blank');
                            if (!printWin) return;
                            const rows = allRecords.map((r: any) => {
                              let age = '';
                              if (r.user.birthday) {
                                const birth = new Date(r.user.birthday);
                                age = String(Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                              }
                              return `<tr>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.name}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.status || '-'}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.gender || '-'}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${age || '-'}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.maritalStatus || '-'}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.distance != null ? `${r.distance}m` : '-'}</td>
                                <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.markedAt ? new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                              </tr>`;
                            }).join('');
                            printWin.document.write(`<!DOCTYPE html><html><head><title>Attendance Report</title>
                              <style>body{font-family:system-ui,sans-serif;padding:30px}h1{font-size:20px;margin-bottom:4px}
                              .stats{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}.stat{background:#f3f4f6;border-radius:10px;padding:12px 20px;text-align:center}
                              .stat b{display:block;font-size:22px}.stat span{font-size:10px;text-transform:uppercase;color:#666}
                              table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:8px 10px;border-bottom:2px solid #333;font-size:12px;text-transform:uppercase;color:#666}
                              td{font-size:13px}@media print{.no-print{display:none}}</style></head><body>
                              <h1>Attendance Report</h1>
                              <p style="color:#666;font-size:13px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                              <div class="stats">
                                <div class="stat"><b>${total}</b><span>Total Present</span></div>
                                <div class="stat"><b>${totalAbsent}</b><span>Total Absent</span></div>
                                <div class="stat"><b>${totalUnmarked}</b><span>Not marked</span></div>
                                <div class="stat"><b>${males}</b><span>Male (Present)</span></div>
                                <div class="stat"><b>${females}</b><span>Female (Present)</span></div>
                                <div class="stat"><b>${married}</b><span>Married</span></div>
                                <div class="stat"><b>${single}</b><span>Single</span></div>
                                <div class="stat"><b>${uniqueFamilies}</b><span>Families</span></div>
                              </div>
                              <table><thead><tr><th>Name</th><th>Status</th><th>Gender</th><th>Age</th><th>Marital</th><th>Distance</th><th>Time</th></tr></thead>
                              <tbody>${rows}</tbody></table>
                              <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#8B2323;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold">
                                Print / Save as PDF
                              </button>
                            </body></html>`);
                            printWin.document.close();
                            toast.success('PDF report opened!');
                          }}>
                            <Download className="w-4 h-4 mr-2 text-[#8B2323]" /> Export PDF
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="directory" className="space-y-3 mt-0 relative">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-9 h-11 rounded-xl bg-white border-[#E5D5C5]/60"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {(() => {
                    const memberSubtitle = (r: any) => {
                      const email = r.user.email || '';
                      const isLinked =
                        !!r.user.isLinkedProfile ||
                        email.startsWith('linked_') ||
                        email.endsWith('@family.internal');
                      const statusLabel =
                        r.status === 'absent'
                          ? 'Absent'
                          : r.status === 'unmarked'
                            ? 'Not marked'
                            : 'Present';
                      if (isLinked) {
                        const parentId = r.user.parentAccountId
                          ? String(r.user.parentAccountId)
                          : email.match(/^linked_([a-f\d]{24})_/i)?.[1];
                        const parentFromContext = parentId
                          ? users.find(
                              (u: any) =>
                                String(u.id) === parentId || String(u._id) === parentId
                            )
                          : undefined;
                        const parentDisplayName =
                          r.user.parentName || parentFromContext?.name;
                        return `${statusLabel} · ${
                          parentDisplayName
                            ? `Linked to ${parentDisplayName}`
                            : 'Linked family profile'
                        }`;
                      }
                      return `${statusLabel}${email ? ` · ${email}` : ''}`;
                    };

                    const memberActions = (r: any) => {
                      const needsFollowUp = r.status === 'absent' || r.status === 'unmarked';
                      const messageOpen = expandedMessageId === r.userId;
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`w-full h-10 rounded-xl justify-center hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-4 ${
                                r.status === 'present'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                  : 'border-[#E5D5C5] text-[#3A2D27] hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800'
                              }`}
                              disabled={updatingStatus[r.userId]}
                              onClick={(e) => {
                                (e.currentTarget as HTMLButtonElement).blur();
                                handleMarkAttendance(
                                  r.userId,
                                  r.status === 'present' ? 'unmarked' : 'present'
                                );
                              }}
                            >
                              {updatingStatus[r.userId] && r.status !== 'present' ? (
                                <RefreshCw className="animate-spin" />
                              ) : (
                                'Present'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`w-full h-10 rounded-xl justify-center hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-4 ${
                                r.status === 'absent'
                                  ? 'bg-[#8B2323] hover:bg-[#721515] text-white border-[#8B2323]'
                                  : 'border-[#E5D5C5] text-[#3A2D27] hover:bg-[#FBE8E8] hover:border-[#E5C5C5] hover:text-[#8B2323]'
                              }`}
                              disabled={updatingStatus[r.userId]}
                              onClick={(e) => {
                                (e.currentTarget as HTMLButtonElement).blur();
                                handleMarkAttendance(
                                  r.userId,
                                  r.status === 'absent' ? 'unmarked' : 'absent'
                                );
                              }}
                            >
                              {updatingStatus[r.userId] && r.status !== 'absent' ? (
                                <RefreshCw className="animate-spin" />
                              ) : (
                                'Absent'
                              )}
                            </Button>
                          </div>

                          {needsFollowUp && (
                            <div className="pt-1 space-y-2">
                              {!messageOpen ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-10 rounded-xl border-[#E5D5C5] text-[#8B2323] hover:bg-[#FBE8E8] hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-4"
                                  onClick={(e) => {
                                    (e.currentTarget as HTMLButtonElement).blur();
                                    setExpandedMessageId(r.userId);
                                  }}
                                >
                                  <MessageCircle />
                                  Send a follow-up message
                                </Button>
                              ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-xs font-semibold text-[#3A2D27]">
                                      Message
                                    </Label>
                                    <button
                                      type="button"
                                      className="text-[10px] text-[#7A6150] hover:text-[#8B2323]"
                                      onClick={() => setExpandedMessageId(null)}
                                    >
                                      Hide
                                    </button>
                                  </div>
                                  <Textarea
                                    placeholder={defaultAbsentMessage}
                                    className="text-sm min-h-[72px] rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                                    value={getMemberMessage(r.userId)}
                                    onChange={(e) =>
                                      setMessageText((prev) => ({
                                        ...prev,
                                        [r.userId]: e.target.value,
                                      }))
                                    }
                                  />
                                  <div
                                    className={`grid gap-2 w-full ${
                                      r.user.whatsapp ? 'grid-cols-2' : 'grid-cols-1'
                                    }`}
                                  >
                                    <Button
                                      size="sm"
                                      className="w-full h-10 rounded-xl bg-[#8B2323] hover:bg-[#721515] text-white justify-center hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-4"
                                      disabled={sendingMessage[r.userId]}
                                      onClick={(e) => {
                                        (e.currentTarget as HTMLButtonElement).blur();
                                        handleSendMessage(r.userId);
                                      }}
                                    >
                                      {sendingMessage[r.userId] ? (
                                        <RefreshCw className="animate-spin" />
                                      ) : (
                                        <Send />
                                      )}
                                      Send in app
                                    </Button>
                                    {r.user.whatsapp && (
                                      <Button
                                        size="sm"
                                        className="w-full h-10 rounded-xl justify-center hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-4"
                                        style={{ backgroundColor: '#25D366', color: 'white' }}
                                        onClick={(e) => {
                                          (e.currentTarget as HTMLButtonElement).blur();
                                          openWhatsApp(r.user.whatsapp, r.userId);
                                        }}
                                      >
                                        <MessageCircle />
                                        WhatsApp
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    };

                    const renderMember = (r: any) => {
                      return (
                        <div
                          key={r.userId}
                          className="flex flex-col gap-3 p-4 rounded-2xl border shadow-sm border-[#E5D5C5]/60 bg-white"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#1A202C] truncate">
                              {r.user.name}
                            </p>
                            <p className="text-xs text-[#7A6150] truncate">{memberSubtitle(r)}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {r.status === 'present' && (
                                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Present
                                </span>
                              )}
                              {r.status === 'absent' && (
                                <span className="text-[10px] font-semibold bg-[#FBE8E8] text-[#8B2323] border border-[#E5C5C5] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Absent
                                </span>
                              )}
                              {r.status === 'unmarked' && (
                                <span className="text-[10px] font-semibold bg-[#FAF7F2] text-[#7A6150] border border-[#E5D5C5] px-2.5 py-0.5 rounded-full">
                                  Not marked
                                </span>
                              )}
                            </div>
                          </div>
                          {memberActions(r)}
                        </div>
                      );
                    };

                    const filteredBySearch = selectedSessionRecords.filter((r: any) => {
                      const q = searchQuery.toLowerCase();
                      const email = r.user.email || '';
                      const isLinked =
                        !!r.user.isLinkedProfile ||
                        email.startsWith('linked_') ||
                        email.endsWith('@family.internal');
                      return (
                        r.user.name?.toLowerCase().includes(q) ||
                        (!isLinked && email.toLowerCase().includes(q)) ||
                        (r.user.parentName || '').toLowerCase().includes(q)
                      );
                    });
                    const needsFollowUpList = filteredBySearch.filter(
                      (r: any) => r.status === 'absent' || r.status === 'unmarked'
                    );

                    return (
                      <Tabs
                        value={membersSubTab}
                        onValueChange={(v) => {
                          setMembersSubTab(v);
                          if (v !== 'undetected') {
                            setMultiSelectMode(false);
                            setSelectedMemberIds([]);
                          }
                        }}
                        className="w-full"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <TabsList className="grid flex-1 grid-cols-2 h-auto p-1 bg-white rounded-xl border border-[#E5D5C5]/60">
                            <TabsTrigger
                              value="undetected"
                              className="rounded-lg py-2 text-xs sm:text-sm data-[state=active]:bg-[#FBE8E8] data-[state=active]:text-[#8B2323] data-[state=active]:shadow-none"
                            >
                              Needs follow-up ({needsFollowUpList.length})
                            </TabsTrigger>
                            <TabsTrigger
                              value="all"
                              className="rounded-lg py-2 text-xs sm:text-sm data-[state=active]:bg-[#FBE8E8] data-[state=active]:text-[#8B2323] data-[state=active]:shadow-none"
                            >
                              Everyone ({filteredBySearch.length})
                            </TabsTrigger>
                          </TabsList>
                          {membersSubTab === 'undetected' && needsFollowUpList.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-xl border-[#E5D5C5] text-[#7A6150] hover:text-[#8B2323] hover:bg-[#FBE8E8] hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-5"
                                  aria-label="Multi select options"
                                >
                                  <MoreVertical />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E5D5C5]">
                                {!multiSelectMode ? (
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                      setMultiSelectMode(true);
                                      setSelectedMemberIds([]);
                                    }}
                                  >
                                    Multi select
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedMemberIds(
                                          needsFollowUpList.map((r: any) => r.userId as string)
                                        );
                                      }}
                                    >
                                      Select all
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-[#8B2323]"
                                      onClick={() => {
                                        setMultiSelectMode(false);
                                        setSelectedMemberIds([]);
                                      }}
                                    >
                                      Cancel multi select
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <TabsContent value="undetected" className="space-y-3 mt-0">
                          {multiSelectMode && (
                            <div className="rounded-xl border border-[#8B2323]/30 bg-[#FBE8E8]/60 px-3 py-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-[#8B2323]">
                                {selectedMemberIds.length} selected
                              </p>
                              {selectedMemberIds.length > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-lg bg-[#8B2323] hover:bg-[#721515] text-white hover:translate-y-0 active:scale-100 focus-visible:ring-0 [&_svg]:!size-3.5"
                                  disabled={bulkSending}
                                  onClick={(e) => {
                                    (e.currentTarget as HTMLButtonElement).blur();
                                    handleBulkSendAndMarkAbsent();
                                  }}
                                >
                                  {bulkSending ? <RefreshCw className="animate-spin" /> : <Send />}
                                  Send & mark absent
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-3 space-y-2 shadow-sm">
                            <Label className="text-xs font-semibold text-[#3A2D27]">
                              Default follow-up message
                            </Label>
                            <p className="text-[10px] text-[#7A6150]">
                              Used for everyone below — you can still edit per person.
                            </p>
                            <Textarea
                              className="text-sm min-h-[60px] rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
                              value={defaultAbsentMessage}
                              onChange={(e) => {
                                setDefaultAbsentMessage(e.target.value);
                                setMessageText({});
                              }}
                            />
                          </div>

                          {needsFollowUpList.length === 0 ? (
                            <div className="text-center py-10 space-y-1">
                              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/70" />
                              <p className="text-sm font-semibold text-[#3A2D27]">All caught up</p>
                              <p className="text-xs text-[#7A6150]">
                                No unmarked or absent members right now.
                              </p>
                            </div>
                          ) : (
                            <ChoiceboxGroup
                              direction="column"
                              type="checkbox"
                              value={selectedMemberIds}
                              onChange={setSelectedMemberIds}
                              selectionActive={multiSelectMode}
                            >
                              {needsFollowUpList.map((r: any) => (
                                <ChoiceboxGroup.Item
                                  key={r.userId}
                                  value={r.userId}
                                  title={r.user.name || 'Member'}
                                  description={memberSubtitle(r)}
                                  actions={memberActions(r)}
                                  onLongPress={() => {
                                    setMultiSelectMode(true);
                                    setSelectedMemberIds((prev) =>
                                      prev.includes(r.userId) ? prev : [...prev, r.userId]
                                    );
                                  }}
                                />
                              ))}
                            </ChoiceboxGroup>
                          )}
                        </TabsContent>
                        <TabsContent value="all" className="space-y-3 mt-0">
                          {filteredBySearch.length === 0 ? (
                            <p className="text-center text-[#7A6150] py-8 text-sm">
                              No members match your search.
                            </p>
                          ) : (
                            filteredBySearch.map((r: any) => renderMember(r))
                          )}
                        </TabsContent>
                      </Tabs>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Session QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Session QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-muted-foreground">
              Display this QR code for members to scan with their camera or the church app.
            </p>
            {selectedSessionForQr && (
              <div className="bg-white p-4 rounded-xl border inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/qr/${selectedSessionForQr._id}`)}&margin=10`}
                  alt="Session QR"
                  width={300}
                  height={300}
                  className="rounded-lg"
                />
              </div>
            )}
            <h3 className="font-bold text-lg mt-4">{selectedSessionForQr?.title}</h3>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setQrDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
