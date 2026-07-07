"use client";

import React, { useState, useEffect } from 'react';
import { useAdminData, canPublishAllCampuses, type LiveStream } from '@/lib/admin-data-context';
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
import { Radio, AlertCircle, CheckCircle2, Save, PlayCircle, EyeOff } from 'lucide-react';

export default function AdminLiveStreamsPage() {
  const { liveStreams, updateLiveStream, currentUser, campuses } = useAdminData();
  const [selectedCampus, setSelectedCampus] = useState(currentUser.campusId);
  const [formData, setFormData] = useState<Partial<LiveStream>>({});
  const [isSaved, setIsSaved] = useState(false);

  const canManageAll = canPublishAllCampuses(currentUser.role);

  // Sync state when selected campus changes
  useEffect(() => {
    const stream = liveStreams.find(ls => ls.campusId === selectedCampus);
    if (stream) {
      setFormData({
        videoId: stream.videoId,
        isLive: stream.isLive,
        title: stream.title,
        description: stream.description,
        isAutoEnabled: stream.isAutoEnabled || false,
        youtubeChannelId: stream.youtubeChannelId || '',
        recurrencePattern: stream.recurrencePattern || 'weekly',
        recurrenceDay: stream.recurrenceDay || 'Sunday',
        recurrenceWeekOfMonth: stream.recurrenceWeekOfMonth || '1st',
        time: stream.time || '10:00',
      });
    } else {
      setFormData({
        videoId: '',
        isLive: false,
        title: '',
        description: '',
        isAutoEnabled: false,
        youtubeChannelId: '',
        recurrencePattern: 'weekly',
        recurrenceDay: 'Sunday',
        recurrenceWeekOfMonth: '1st',
        time: '10:00',
      });
    }
  }, [selectedCampus, liveStreams]);

  const handleSave = () => {
    updateLiveStream(selectedCampus, formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stream Settings</CardTitle>
                  <CardDescription>Configure your YouTube live stream parameters.</CardDescription>
                </div>
                {canManageAll && (
                  <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Broadcast Status</Label>
                    <p className="text-sm text-muted-foreground">Toggle this to make the stream visible to the congregation.</p>
                  </div>
                  <Switch 
                    checked={formData.isLive || false} 
                    onCheckedChange={(c) => setFormData({ ...formData, isLive: c })}
                  />
                </div>
                {formData.isLive ? (
                  <Badge className="bg-red-600 text-white gap-2">
                    <Radio className="w-3 h-3 animate-pulse" /> LIVE NOW
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-2">
                    <EyeOff className="w-3 h-3" /> OFFLINE
                  </Badge>
                )}
              </div>

              <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Automated Stream Checker</Label>
                    <p className="text-sm text-muted-foreground">Automatically ping YouTube and go live based on a schedule.</p>
                  </div>
                  <Switch 
                    checked={formData.isAutoEnabled || false} 
                    onCheckedChange={(c) => setFormData({ ...formData, isAutoEnabled: c })}
                  />
                </div>
                
                {formData.isAutoEnabled && (
                  <div className="grid gap-4 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="youtubeChannelId">YouTube Channel Handle</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground bg-muted px-3 py-2 rounded-md border text-sm">youtube.com/</span>
                        <Input 
                          id="youtubeChannelId" 
                          placeholder="e.g. @GraceCommunityChurch" 
                          value={formData.youtubeChannelId || ''}
                          onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Recurrence</Label>
                        <Select 
                          value={formData.recurrencePattern || 'weekly'} 
                          onValueChange={(val: any) => setFormData({ ...formData, recurrencePattern: val })}
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
                      
                      {formData.recurrencePattern === 'weekly' && (
                        <div className="space-y-2">
                          <Label>Day of Week</Label>
                          <Select 
                            value={formData.recurrenceDay || 'Sunday'} 
                            onValueChange={(val) => setFormData({ ...formData, recurrenceDay: val })}
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
                      
                      {formData.recurrencePattern === 'custom_monthly' && (
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Week of Month</Label>
                            <Select 
                              value={formData.recurrenceWeekOfMonth || '1st'} 
                              onValueChange={(val) => setFormData({ ...formData, recurrenceWeekOfMonth: val })}
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
                              value={formData.recurrenceDay || 'Sunday'} 
                              onValueChange={(val) => setFormData({ ...formData, recurrenceDay: val })}
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
                        value={formData.time || '10:00'}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">The system will check for a live video every 30 seconds for 30 minutes around this time.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoId">YouTube Video ID <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground bg-muted px-3 py-2 rounded-md border text-sm">youtube.com/watch?v=</span>
                  <Input 
                    id="videoId" 
                    placeholder="e.g. jfKfPfyJRdk" 
                    value={formData.videoId || ''}
                    onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mix-blend-opacity-70">
                  Ensure the video privacy is set to Public or Unlisted on YouTube.
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
              {formData.videoId ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border shadow-md">
                    <iframe
                      src={getEmbedUrl(formData.videoId)}
                      title="Preview"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                    {formData.isLive && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-red-600 text-white border-0 shadow-sm text-[10px] px-1.5 py-0 h-4">LIVE</Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm line-clamp-1">{formData.title || 'Untitled Broadcast'}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{formData.description || 'No description provided.'}</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted/50 rounded-xl flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No Video Configured</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                    Enter a YouTube Video ID to preview your broadcast here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
