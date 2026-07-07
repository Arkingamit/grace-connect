"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapPin, Plus, Trash2, Users, RefreshCw, Repeat, Calendar, Download, FileSpreadsheet, PieChart, QrCode } from 'lucide-react';
import { SchedulePreviewExport } from '@/components/admin/schedule-preview-export';
import { useAdminData } from '@/lib/admin-data-context';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export default function AdminAttendancePage() {
  const { campuses, currentUser } = useAdminData();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [selectedSessionRecords, setSelectedSessionRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSessionForQr, setSelectedSessionForQr] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    campusId: currentUser?.campusId || 'main',
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
    checkInConfig: {
      selfCheckInEnabled: true,
      selfCheckInRequireGps: true,
      scannerEnabled: true,
      scannerRequireGps: false,
    }
  });

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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A202C]">Attendance Tracking</h1>
          <p className="text-muted-foreground mt-1">Configure geolocation attendance sessions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#8B2323] hover:bg-[#721515] w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
          <p className="text-muted-foreground mb-4">Create an attendance session to allow members to check in.</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">Create Session</Button>
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
                      {s.recurring && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Repeat className="w-3 h-3"/> Recurring</span>}
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
                    <span className="text-muted-foreground">Radius:</span>
                    <span className="font-medium">{s.radius} meters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-medium truncate max-w-[120px]">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:flex gap-2 pt-2 border-t">
                  <Button variant="outline" className="w-full sm:flex-1" onClick={() => viewRecords(s._id)}>
                    <Users className="w-4 h-4 sm:mr-2 mr-1 shrink-0" /> <span className="truncate text-xs sm:text-sm">Records</span>
                  </Button>
                  <Button variant="outline" className="w-full sm:flex-1" onClick={() => { setSelectedSessionForQr(s); setQrDialogOpen(true); }}>
                    <QrCode className="w-4 h-4 sm:mr-2 mr-1 shrink-0" /> <span className="truncate text-xs sm:text-sm">Show QR</span>
                  </Button>
                  <Button variant="outline" className="col-span-2 w-full sm:w-auto sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(s._id)}>
                    <Trash2 className="w-4 h-4 sm:mr-0 mr-2 shrink-0" /> <span className="sm:hidden text-xs">Delete Session</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] h-auto max-h-[90vh] p-0 flex flex-col bg-[#FAF7F2] border-[#E5D5C5] rounded-[24px] overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-[#E5D5C5]/60 shrink-0 bg-[#FAF7F2]">
            <DialogTitle className="font-serif text-2xl text-[#1A202C]">Create Attendance Session</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#FAF7F2]">
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Sunday Service - Main Campus" />
            </div>
            {currentUser?.role !== 'campus_leader' && (
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select value={form.campusId} onValueChange={(val) => setForm({...form, campusId: val})}>
                  <SelectTrigger><SelectValue placeholder="Select a campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{form.recurring ? 'Start Date' : 'Date'}</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Radius (meters)</Label>
                <Input type="number" min={10} max={300} value={form.radius} onChange={e => setForm({...form, radius: parseInt(e.target.value) || 0})} onBlur={() => setForm({...form, radius: Math.min(300, Math.max(10, form.radius))})} />
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Switch checked={form.recurring} onCheckedChange={(c) => setForm({...form, recurring: c})} />
              <Label>Recurring Session</Label>
            </div>

            {form.recurring && (
              <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4 space-y-4">
                <div className="text-xs text-muted-foreground bg-violet-500/10 p-2 rounded-md flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Recurring sequence is based on the Session Start Date: <span className="font-semibold text-foreground">{form.date || <span className="text-red-500 italic">Not set</span>}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Pattern</Label>
                    <Select value={form.recurrencePattern} onValueChange={(v) => setForm({...form, recurrencePattern: v})}>
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
                      <Label className="text-xs">Day of Week</Label>
                      <Select value={form.recurrenceDay} onValueChange={(v) => setForm({...form, recurrenceDay: v})}>
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
                      <Label className="text-xs">Week of Month</Label>
                      <Select value={form.recurrenceWeekOfMonth} onValueChange={(v) => setForm({...form, recurrenceWeekOfMonth: v})}>
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
                {/* Note removed */}
                <div className="space-y-2">
                  <Label className="text-xs">Until (Optional)</Label>
                  <Input type="date" className="h-8 text-xs" value={form.recurrenceEndDate} onChange={e => setForm({...form, recurrenceEndDate: e.target.value})} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-bold">Location Coordinates</Label>
                <Button size="sm" variant="secondary" onClick={getCurrentLocation}>
                  <MapPin className="w-3 h-3 mr-1" /> Use My Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Latitude</Label>
                  <Input type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Longitude</Label>
                  <Input type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">You can also copy/paste coordinates from Google Maps (Right-click a location to copy).</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
              <Label className="font-bold">Check-in Configuration</Label>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow Self Check-in</Label>
                    <p className="text-[10px] text-muted-foreground">Members can check in from their app</p>
                  </div>
                  <Switch checked={form.checkInConfig.selfCheckInEnabled} onCheckedChange={(c) => setForm({...form, checkInConfig: {...form.checkInConfig, selfCheckInEnabled: c}})} />
                </div>
                {form.checkInConfig.selfCheckInEnabled && (
                  <div className="flex items-center justify-between pl-4 border-l-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Require GPS for Self Check-in</Label>
                      <p className="text-[10px] text-muted-foreground">User must be within radius</p>
                    </div>
                    <Switch checked={form.checkInConfig.selfCheckInRequireGps} onCheckedChange={(c) => setForm({...form, checkInConfig: {...form.checkInConfig, selfCheckInRequireGps: c}})} />
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow Scanner</Label>
                    <p className="text-[10px] text-muted-foreground">Leaders can scan member ePasses</p>
                  </div>
                  <Switch checked={form.checkInConfig.scannerEnabled} onCheckedChange={(c) => setForm({...form, checkInConfig: {...form.checkInConfig, scannerEnabled: c}})} />
                </div>
                {form.checkInConfig.scannerEnabled && (
                  <div className="flex items-center justify-between pl-4 border-l-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Verify Leader GPS</Label>
                      <p className="text-[10px] text-muted-foreground">Leader must be in radius when scanning</p>
                    </div>
                    <Switch checked={form.checkInConfig.scannerRequireGps} onCheckedChange={(c) => setForm({...form, checkInConfig: {...form.checkInConfig, scannerRequireGps: c}})} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-[#E5D5C5]/60 shrink-0 bg-[#FAF7F2]">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#8B2323] hover:bg-[#721515] rounded-xl text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Records Dialog with Insights & Export */}
      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" /> Attendance Report & Insights
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {loadingRecords ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : selectedSessionRecords.length === 0 ? (
              <p className="text-center text-muted-foreground p-8">No members have checked in yet.</p>
            ) : (
              <>
                {/* Insights Dashboard */}
                {(() => {
                  const records = selectedSessionRecords;
                  const total = records.length;
                  const now = new Date();

                  // Gender breakdown
                  const males = records.filter((r: any) => r.user.gender === 'male').length;
                  const females = records.filter((r: any) => r.user.gender === 'female').length;

                  // Marital status
                  const married = records.filter((r: any) => r.user.maritalStatus === 'married').length;
                  const single = records.filter((r: any) => r.user.maritalStatus === 'single').length;

                  // Age group calculations
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

                  // Families (users who share a familyMemberId)
                  const familyIds = records
                    .map((r: any) => r.user.familyMemberId)
                    .filter(Boolean);
                  const uniqueFamilies = new Set(familyIds.map(String)).size;

                  return (
                    <div className="space-y-4">
                      {/* Top stats row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[#FAF7F2] border border-[#E5D5C5] rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-[#3A2D27]">{total}</p>
                          <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Total</p>
                        </div>
                        <div className="bg-[#F3EAE1] border border-[#E5D5C5] rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-[#5C4535]">{married}</p>
                          <p className="text-[10px] font-semibold text-[#7A6150] uppercase tracking-wider">Married</p>
                        </div>
                        <div className="bg-[#E5D5C5] border border-[#D5C5B5] rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-[#3A2D27]">{single}</p>
                          <p className="text-[10px] font-semibold text-[#5C4535] uppercase tracking-wider">Single</p>
                        </div>
                        <div className="bg-[#FBE8E8] border border-[#E8D5D5] rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-[#8B2323]">{uniqueFamilies}</p>
                          <p className="text-[10px] font-semibold text-[#8B2323] uppercase tracking-wider">Families</p>
                        </div>
                      </div>

                      {/* Gender + Age breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gender */}
                        <div className="border rounded-xl p-4">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Gender</h4>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1"><span>Male</span><span className="font-bold">{males}</span></div>
                              <div className="w-full bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#5C4535] h-2 rounded-full" style={{ width: `${total ? (males/total)*100 : 0}%` }} /></div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1"><span>Female</span><span className="font-bold">{females}</span></div>
                              <div className="w-full bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#8B2323] h-2 rounded-full" style={{ width: `${total ? (females/total)*100 : 0}%` }} /></div>
                            </div>
                          </div>
                        </div>

                        {/* Age Groups */}
                        <div className="border rounded-xl p-4">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Age Groups</h4>
                          <div className="space-y-1.5">
                            {Object.entries(ageGroups).filter(([, v]) => v > 0).map(([label, count]) => (
                              <div key={label} className="flex items-center gap-2 text-xs">
                                <span className="w-16 text-muted-foreground">{label}</span>
                                <div className="flex-1 bg-[#FAF7F2] rounded-full h-2"><div className="bg-[#7A6150] h-2 rounded-full transition-all" style={{ width: `${total ? (count/total)*100 : 0}%` }} /></div>
                                <span className="w-6 text-right font-bold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Export Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => {
                          // Export to Excel (CSV)
                          const headers = ['Name', 'Email', 'Gender', 'Age', 'Marital Status', 'Distance (m)', 'Time'];
                          const rows = records.map((r: any) => {
                            let age = '';
                            if (r.user.birthday) {
                              const birth = new Date(r.user.birthday);
                              age = String(Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                            }
                            return [
                              r.user.name,
                              r.user.email,
                              r.user.gender || '',
                              age,
                              r.user.maritalStatus || '',
                              r.distance,
                              new Date(r.markedAt).toLocaleString()
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
                          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => {
                          // Export to PDF (printable HTML)
                          const printWin = window.open('', '_blank');
                          if (!printWin) return;
                          const rows = records.map((r: any) => {
                            let age = '';
                            if (r.user.birthday) {
                              const birth = new Date(r.user.birthday);
                              age = String(Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                            }
                            return `<tr>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.name}</td>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.gender || '-'}</td>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${age || '-'}</td>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.user.maritalStatus || '-'}</td>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.distance}m</td>
                              <td style="padding:6px 10px;border-bottom:1px solid #eee">${new Date(r.markedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
                            </tr>`;
                          }).join('');
                          printWin.document.write(`<!DOCTYPE html><html><head><title>Attendance Report</title>
                            <style>body{font-family:system-ui,sans-serif;padding:30px}h1{font-size:20px;margin-bottom:4px}
                            .stats{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}.stat{background:#f3f4f6;border-radius:10px;padding:12px 20px;text-align:center}
                            .stat b{display:block;font-size:22px}.stat span{font-size:10px;text-transform:uppercase;color:#666}
                            table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:8px 10px;border-bottom:2px solid #333;font-size:12px;text-transform:uppercase;color:#666}
                            td{font-size:13px}@media print{.no-print{display:none}}</style></head><body>
                            <h1>Attendance Report</h1>
                            <p style="color:#666;font-size:13px">${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                            <div class="stats">
                              <div class="stat"><b>${total}</b><span>Total</span></div>
                              <div class="stat"><b>${males}</b><span>Male</span></div>
                              <div class="stat"><b>${females}</b><span>Female</span></div>
                              <div class="stat"><b>${married}</b><span>Married</span></div>
                              <div class="stat"><b>${single}</b><span>Single</span></div>
                              <div class="stat"><b>${uniqueFamilies}</b><span>Families</span></div>
                            </div>
                            <table><thead><tr><th>Name</th><th>Gender</th><th>Age</th><th>Status</th><th>Distance</th><th>Time</th></tr></thead>
                            <tbody>${rows}</tbody></table>
                            <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#8B2323;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold">
                              Print / Save as PDF
                            </button>
                          </body></html>`);
                          printWin.document.close();
                          toast.success('PDF report opened!');
                        }}>
                          <Download className="w-4 h-4 mr-2" /> Export PDF
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Member List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase px-2 pt-2">Individual Records</h4>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground px-2 pb-2 border-b">
                    <span>MEMBER</span>
                    <span>DISTANCE / TIME</span>
                  </div>
                  {selectedSessionRecords.map(r => (
                    <div key={r._id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                      <div>
                        <p className="font-bold text-sm">{r.user.name}</p>
                        <p className="text-xs text-muted-foreground">{r.user.email}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {r.user.gender && <span className="text-[10px] bg-[#FAF7F2] text-[#7A6150] border border-[#E5D5C5] px-2 py-0.5 rounded-full capitalize">{r.user.gender}</span>}
                          {r.user.maritalStatus && <span className="text-[10px] bg-[#F3EAE1] text-[#5C4535] border border-[#E5D5C5] px-2 py-0.5 rounded-full capitalize">{r.user.maritalStatus}</span>}
                          {r.user.birthday && (() => {
                            const birth = new Date(r.user.birthday);
                            const age = Math.floor((new Date().getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                            return <span className="text-[10px] bg-[#E5D5C5] text-[#3A2D27] border border-[#D5C5B5] px-2 py-0.5 rounded-full">Age {age}</span>;
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#8B2323]">{r.distance}m away</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.markedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
