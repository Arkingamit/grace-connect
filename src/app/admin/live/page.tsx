"use client";

import React, { useState, useEffect } from 'react';
import { useAdminData, canPublishAllCampuses, canManageLiveFrequency, type LiveStream } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Radio, CheckCircle2, Save, PlayCircle, EyeOff, Plus, Trash2 } from 'lucide-react';
import { SendNotificationOption } from '@/components/admin/send-notification-option';
import { getAutoCheckers, newAutoChecker, syncLegacyAutoFields, type LiveAutoChecker } from '@/lib/live-auto-checkers';

type CheckResult = { isLive?: boolean; videoId?: string; error?: string };

export default function AdminLiveStreamsPage() {
  const { liveStreams, updateLiveStream, currentUser, campuses } = useAdminData();
  const [selectedCampus, setSelectedCampus] = useState(currentUser.campusId);
  const [formData, setFormData] = useState<Partial<LiveStream>>({});
  const [autoCheckers, setAutoCheckers] = useState<LiveAutoChecker[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});

  const canManageAll = canPublishAllCampuses(currentUser.role);
  const canManageFrequency = canManageLiveFrequency(currentUser.role);

  useEffect(() => {
    const stream = liveStreams.find((ls) => ls.campusId === selectedCampus);
    if (stream) {
      setFormData({
        videoId: stream.videoId,
        isLive: stream.isLive,
        title: stream.title,
        description: stream.description,
        notifyWhenLive: !!stream.notifyWhenLive,
        liveSource: stream.liveSource || 'manual',
      });
      setAutoCheckers(getAutoCheckers(stream));
    } else {
      setFormData({
        videoId: '',
        isLive: false,
        title: '',
        description: '',
        notifyWhenLive: false,
        liveSource: 'manual',
      });
      setAutoCheckers([]);
    }
    setCheckResults({});
  }, [selectedCampus, liveStreams]);

  const handleSave = () => {
    updateLiveStream(selectedCampus, {
      ...formData,
      ...syncLegacyAutoFields(autoCheckers),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCheckNow = async (checker: LiveAutoChecker) => {
    if (!checker.youtubeChannelId) return;
    setCheckingId(checker.id);
    setCheckResults((prev) => ({ ...prev, [checker.id]: {} }));
    try {
      const res = await fetch(`/api/youtube/check-live?channelId=${encodeURIComponent(checker.youtubeChannelId)}`);
      if (res.ok) {
        const data = await res.json();
        setCheckResults((prev) => ({ ...prev, [checker.id]: data }));
        if (data.isLive && data.videoId) {
          setFormData((prev) => ({
            ...prev,
            isLive: true,
            videoId: data.videoId,
            liveSource: 'auto',
          }));
        }
      } else {
        setCheckResults((prev) => ({ ...prev, [checker.id]: { error: 'Failed to check status' } }));
      }
    } catch {
      setCheckResults((prev) => ({ ...prev, [checker.id]: { error: 'Network error' } }));
    } finally {
      setCheckingId(null);
    }
  };

  const updateChecker = (id: string, updates: Partial<LiveAutoChecker>) => {
    setAutoCheckers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const getEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Live Broadcasts</h1>
        <p className="text-muted-foreground">
          {canManageAll
            ? "Manage live streams across all campuses."
            : "Manage the live worship broadcast for your campus."}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Stream Settings</CardTitle>
                  <CardDescription>Use a manual broadcast, one or more auto checkers, or both.</CardDescription>
                </div>
                {canManageAll && (
                  <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Manual Broadcast</Label>
                    <p className="text-sm text-muted-foreground">Turn this on yourself and paste a YouTube Video ID. Auto checkers will not turn a manual broadcast off.</p>
                  </div>
                  <Switch
                    checked={formData.isLive || false}
                    onCheckedChange={(c) => setFormData({
                      ...formData,
                      isLive: c,
                      liveSource: c ? 'manual' : formData.liveSource,
                    })}
                  />
                </div>
                {formData.isLive ? (
                  <Badge className="bg-red-600 text-white gap-2">
                    <Radio className="w-3 h-3 animate-pulse" /> LIVE NOW
                    {formData.liveSource === 'auto' ? ' · Auto' : ' · Manual'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-2">
                    <EyeOff className="w-3 h-3" /> OFFLINE
                  </Badge>
                )}
              </div>

              <SendNotificationOption
                checked={!!formData.notifyWhenLive}
                onChange={(send) => setFormData({ ...formData, notifyWhenLive: send })}
                description="When this campus goes live — manually or by auto-check — members get a push and in-app alert. Leave unchecked to go live quietly."
              />

              <div className="space-y-2">
                <Label htmlFor="videoId">YouTube Video ID</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground bg-muted px-3 py-2 rounded-md border text-sm">youtube.com/watch?v=</span>
                  <Input
                    id="videoId"
                    placeholder="e.g. jfKfPfyJRdk"
                    value={formData.videoId || ''}
                    onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for a manual broadcast. Auto checkers fill this in when they find a live video.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Broadcast Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Sunday Morning Worship"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  placeholder="Join us as Pastor Mark shares a message..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-base font-semibold">Automated Stream Checkers</Label>
                    <p className="text-sm text-muted-foreground">Add as many as you need — Sunday morning, midweek, another campus channel, and so on.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => setAutoCheckers((prev) => [...prev, newAutoChecker({
                      name: `Checker ${prev.length + 1}`,
                    })])}
                  >
                    <Plus className="w-4 h-4" /> Add checker
                  </Button>
                </div>

                {autoCheckers.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    No auto checkers yet. Use Manual Broadcast above, or add a checker to watch a YouTube channel on a schedule.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {autoCheckers.map((checker, index) => (
                      <AutoCheckerCard
                        key={checker.id}
                        checker={checker}
                        index={index}
                        canManageFrequency={canManageFrequency}
                        isChecking={checkingId === checker.id}
                        checkResult={checkResults[checker.id]}
                        onChange={(updates) => updateChecker(checker.id, updates)}
                        onCheck={() => handleCheckNow(checker)}
                        onRemove={() => setAutoCheckers((prev) => prev.filter((c) => c.id !== checker.id))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between rounded-b-xl border-t">
              <div className="text-sm">
                {isSaved && (
                  <span className="text-success flex items-center gap-1 font-medium animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-4 h-4" /> Changes applied instantly
                  </span>
                )}
              </div>
              <Button onClick={handleSave} className="gap-2 min-w-[120px]">
                <Save className="w-4 h-4" /> Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.isLive && formData.videoId ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border shadow-md">
                    <iframe
                      src={getEmbedUrl(formData.videoId)}
                      title="Preview"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-red-600 text-white border-0 shadow-sm text-[10px] px-1.5 py-0 h-4 gap-1">
                        <Radio className="w-2.5 h-2.5" /> LIVE
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm line-clamp-1">{formData.title || 'Untitled Broadcast'}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{formData.description || 'No description provided.'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1A202C] ring-1 ring-border shadow-md flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <EyeOff className="w-6 h-6 text-white/50" />
                    </div>
                    <p className="text-sm font-semibold text-white">Not live right now</p>
                    <p className="text-xs text-white/60 mt-1 max-w-[220px]">
                      {formData.videoId
                        ? 'Turn on Manual Broadcast to start the preview.'
                        : 'Paste a Video ID for a manual broadcast, or let an auto checker find one.'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm line-clamp-1">{formData.title || 'Live Broadcast'}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{formData.description || 'Join our live service'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AutoCheckerCard({
  checker,
  index,
  canManageFrequency,
  isChecking,
  checkResult,
  onChange,
  onCheck,
  onRemove,
}: {
  checker: LiveAutoChecker;
  index: number;
  canManageFrequency: boolean;
  isChecking: boolean;
  checkResult?: CheckResult;
  onChange: (updates: Partial<LiveAutoChecker>) => void;
  onCheck: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Label>Checker name</Label>
          <Input
            placeholder={`Checker ${index + 1}`}
            value={checker.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 pt-7">
          <Switch
            checked={checker.enabled}
            onCheckedChange={(enabled) => onChange({ enabled })}
          />
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove checker">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {checker.enabled && (
        <div className="grid gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <Label>YouTube Channel Handle</Label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex items-center flex-1">
                <span className="text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 text-sm whitespace-nowrap">youtube.com/</span>
                <Input
                  className="rounded-l-none"
                  placeholder="e.g. @Grace"
                  value={checker.youtubeChannelId || ''}
                  onChange={(e) => onChange({ youtubeChannelId: e.target.value })}
                />
              </div>
              <Button
                variant="secondary"
                onClick={onCheck}
                disabled={isChecking || !checker.youtubeChannelId}
                className="shrink-0"
              >
                {isChecking ? 'Checking...' : 'Check Now'}
              </Button>
            </div>
            {checkResult && (checkResult.error || checkResult.isLive !== undefined) && (
              <div className={`text-sm mt-2 p-3 rounded-md border ${checkResult.error ? 'bg-destructive/10 text-destructive border-destructive/20' : checkResult.isLive ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-muted border-border'}`}>
                {checkResult.error
                  ? checkResult.error
                  : checkResult.isLive
                    ? `Live broadcast found! ID: ${checkResult.videoId}`
                    : 'No active live broadcast found right now.'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select
                value={checker.recurrencePattern || 'weekly'}
                onValueChange={(val: 'weekly' | 'custom_monthly') => onChange({ recurrencePattern: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom_monthly">Custom Monthly (e.g. 1st Sunday)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {checker.recurrencePattern !== 'custom_monthly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={checker.recurrenceDay || 'Sunday'}
                  onValueChange={(val) => onChange({ recurrenceDay: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {checker.recurrencePattern === 'custom_monthly' && (
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Week of Month</Label>
                  <Select
                    value={checker.recurrenceWeekOfMonth || '1st'}
                    onValueChange={(val) => onChange({ recurrenceWeekOfMonth: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Week" />
                    </SelectTrigger>
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
                  <Label>Day of Week</Label>
                  <Select
                    value={checker.recurrenceDay || 'Sunday'}
                    onValueChange={(val) => onChange({ recurrenceDay: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sunday">Sunday</SelectItem>
                      <SelectItem value="Monday">Monday</SelectItem>
                      <SelectItem value="Tuesday">Tuesday</SelectItem>
                      <SelectItem value="Wednesday">Wednesday</SelectItem>
                      <SelectItem value="Thursday">Thursday</SelectItem>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Check Time</Label>
            <Input
              type="time"
              value={checker.time || '10:00'}
              onChange={(e) => onChange({ time: e.target.value })}
            />
          </div>

          {canManageFrequency ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check every</Label>
                <Select
                  value={String(checker.checkIntervalSeconds || 30)}
                  onValueChange={(val) => onChange({ checkIntervalSeconds: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="45">45 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>For this long</Label>
                <Select
                  value={String(checker.checkWindowMinutes || 30)}
                  onValueChange={(val) => onChange({ checkWindowMinutes: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            This checker looks for a live video every {checker.checkIntervalSeconds || 30} seconds for {checker.checkWindowMinutes || 30} minutes around this time (India / Ahmedabad).
            {canManageFrequency ? '' : ' Ask IT Team to change the frequency.'}
          </p>
        </div>
      )}
    </div>
  );
}
