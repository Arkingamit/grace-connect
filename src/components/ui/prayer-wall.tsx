"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Plus, Shield, Clock, Users, Loader2, Building2, User, Send, CheckCircle2, Radio, EyeOff, UserCheck, Globe, Church, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from "@/lib/admin-data-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '@/lib/utils';
import { formatDDMMYYYY, formatDateMonthTime } from '@/lib/date-utils';
import { PRAYER_FIELD_LIMITS } from '@/lib/field-limits';

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  authorName: string;
  isAnonymous: boolean;
  privacy: string;
  category: string;
  prayedCount: number;
  comments: number;
  createdAt: string;
  status?: string;
  prayedBy?: string[];
  targetGroups?: string[];
  isBroadcast?: boolean;
}

const categoryColors = {
  Health: "bg-success/10 text-success",
  Career: "bg-accent/10 text-accent-foreground",
  Relationships: "bg-prayer/10 text-prayer",
  Church: "bg-primary/10 text-primary",
  Family: "bg-muted text-muted-foreground",
  General: "bg-gray-100 text-gray-800"
};

export function PrayerWall({ variant = 'widget' }: { variant?: 'page' | 'widget' }) {
  return (
    <React.Suspense fallback={null}>
      <PrayerWallInner variant={variant} />
    </React.Suspense>
  );
}

function PrayerWallInner({ variant = 'widget' }: { variant?: 'page' | 'widget' }) {
  if (variant === 'page') {
    return <PrayerWallPageLayout />;
  }
  return <PrayerWallWidgetLayout />;
}

// Helper to resolve campus name and permissions across string IDs, names, or fallbacks
function resolveCampusInfo(
  campusesList: any[],
  rawCampusId?: string | null,
  rawCampusName?: string | null
) {
  const cleanId = String(rawCampusId || '').trim();
  const cleanName = String(rawCampusName || '').trim();

  const found = campusesList.find((c: any) => {
    const cid = String(c.id || c._id || '').trim();
    const cname = String(c.name || '').trim().toLowerCase();
    if (cleanId) {
      if (cid && cid.toLowerCase() === cleanId.toLowerCase()) return true;
      if (cname && cname === cleanId.toLowerCase()) return true;
    }
    if (cleanName) {
      if (cname && cname === cleanName.toLowerCase()) return true;
    }
    return false;
  }) || (cleanId === 'main' || cleanId === 'global' ? campusesList[0] : undefined);

  let name = found?.name || '';
  if (!name && cleanName && cleanName !== 'global' && cleanName !== 'main') {
    name = cleanName;
  }
  if (!name && cleanId && cleanId !== 'global' && cleanId !== 'main' && !cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    name = cleanId;
  }
  if (!name && campusesList.length > 0) {
    name = campusesList[0].name;
  }

  const allowedLevel: 'all_campuses' | 'campus_only' | 'group_only' =
    found?.prayerBroadcastLevel || 'all_campuses';
  const pastor = found?.pastor || found?.pastorName || '';

  return {
    campus: found,
    name: name || 'Local Campus',
    pastor,
    allowedLevel,
  };
}

// --- WIDGET LAYOUT (Original Component UI) ---
function PrayerWallWidgetLayout() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [broadcastScope, setBroadcastScope] = useState<'all_campuses' | 'campus' | 'group'>('all_campuses');
  const [targetGroup, setTargetGroup] = useState<string>('all');
  const [showShareModal, setShowShareModal] = useState(false);

  const [newRequest, setNewRequest] = useState({
    title: '',
    content: '',
    campusId: ''
  });

  const { getSessionMember } = useAuth();
  const sessionMember = getSessionMember();
  const [campuses, setCampuses] = useState<{ id: string; name: string; prayerBroadcastLevel?: 'all_campuses' | 'campus_only' | 'group_only'; pastorName?: string }[]>([]);

  useEffect(() => {
    fetch('/api/campuses')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCampuses(data.map(c => ({
            id: c._id || c.id,
            name: c.name,
            prayerBroadcastLevel: c.prayerBroadcastLevel,
            pastorName: c.pastor || c.pastorName
          })));
        }
      })
      .catch(console.error);
  }, []);

  const userCampusRaw = sessionMember?.campusId || newRequest.campusId || (sessionMember as any)?.campus;
  const userCampusNameRaw = (sessionMember as any)?.campusName || (sessionMember as any)?.campus;
  const campusInfo = resolveCampusInfo(campuses, userCampusRaw, userCampusNameRaw);
  const currentCampus = campusInfo.campus;
  const userCampusId = currentCampus?.id || currentCampus?._id || userCampusRaw;
  const allowedBroadcastLevel: 'all_campuses' | 'campus_only' | 'group_only' = campusInfo.allowedLevel;
  const memberGroups = sessionMember?.groups || [];

  const fetchPrayers = async () => {
    try {
      const res = await fetch('/api/prayers');
      if (res.ok) {
        const data = await res.json();
        setPrayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch prayers', error);
      toast.error('Failed to load prayer requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, []);

  const handleOpenShareSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionMember && !newRequest.campusId) {
      toast.error('Please select a campus');
      return;
    }
    if (!newRequest.title.trim() || !newRequest.content.trim()) {
      toast.error('Please fill in both title and prayer request');
      return;
    }
    if (newRequest.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    if (newRequest.content.trim().length < 3) {
      toast.error('Prayer request must be at least 3 characters');
      return;
    }

    if (allowedBroadcastLevel === 'group_only') {
      setBroadcastScope('group');
      if (targetGroup === 'all' && memberGroups.length > 0) {
        setTargetGroup(memberGroups[0]);
      }
    } else if (allowedBroadcastLevel === 'campus_only' && broadcastScope === 'all_campuses') {
      setBroadcastScope('campus');
    }

    setShowShareModal(true);
  };

  const handleConfirmShare = async () => {
    setSubmitting(true);
    try {
      const payload: any = {
        ...newRequest,
        title: newRequest.title.slice(0, PRAYER_FIELD_LIMITS.title),
        content: newRequest.content.slice(0, PRAYER_FIELD_LIMITS.content),
        isAnonymous,
        broadcastScope,
        targetCampuses: broadcastScope === 'all_campuses' ? ['all'] : userCampusId ? [userCampusId] : [],
        targetGroups: broadcastScope === 'group' && targetGroup !== 'all' ? [targetGroup] : [],
      };
      if (sessionMember) {
        payload.campusId = sessionMember.campusId;
      }
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Prayer request submitted! It will appear once approved by your campus pastor.');
        setShowShareModal(false);
        setShowForm(false);
        setNewRequest({ title: '', content: '', campusId: '' });
        setIsAnonymous(false);
        setBroadcastScope('all_campuses');
        setTargetGroup('all');
        fetchPrayers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.details?.[0]?.message || data.error || 'Failed to submit prayer request');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePray = async (id: string) => {
    const userId = String(sessionMember?._id || sessionMember?.id || '');
    try {
      const res = await fetch(`/api/prayers/${id}/pray`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPrayers(prev => prev.map(p => p.id === id ? {
          ...p,
          prayedCount: data.prayedCount,
          prayedBy: data.prayed
            ? [...(p.prayedBy || []).filter((pid) => String(pid) !== userId), userId]
            : (p.prayedBy || []).filter((pid) => String(pid) !== userId),
        } : p));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update prayer');
      }
    } catch (error) {
      toast.error('Failed to record prayer');
    }
  };

  return (
    <section id="prayers" className="py-10 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-5 mb-12">
            <span className="section-heading">Community</span>
            <h2 className="section-title">Prayer Wall</h2>
            <p className="section-subtitle">
              Share your prayer requests and pray for others in our community
            </p>
          </div>

          <div className="text-center mb-8">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-prayer to-prayer/80 hover:opacity-90"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Share Prayer Request
            </Button>
          </div>

          {showForm && (
            <Card className="mb-8 border-prayer/20 animate-in fade-in slide-in-from-top-4">
              <CardHeader>
                <h3 className="text-lg font-semibold">Share Your Prayer Request</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOpenShareSettings} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Prayer request title"
                      value={newRequest.title}
                      maxLength={PRAYER_FIELD_LIMITS.title}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value.slice(0, PRAYER_FIELD_LIMITS.title) }))}
                      required
                      minLength={3}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Share your prayer request..."
                      rows={4}
                      value={newRequest.content}
                      maxLength={PRAYER_FIELD_LIMITS.content}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, content: e.target.value.slice(0, PRAYER_FIELD_LIMITS.content) }))}
                      required
                      minLength={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!sessionMember && (
                      <div className="sm:col-span-2">
                        <select
                          value={newRequest.campusId}
                          onChange={(e) => setNewRequest(prev => ({ ...prev, campusId: e.target.value }))}
                          className="w-full text-sm border rounded px-3 py-2 bg-transparent"
                          required
                        >
                          <option value="">Select your Campus *</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Building2 className="w-3 h-3 inline mr-1" />
                          Required so we can route your request to the correct campus pastor for approval.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="bg-[#8B2323] hover:bg-[#6b1b1b] text-white font-semibold">
                      Share Prayer
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <PrayerShareSettingsModal
            open={showShareModal}
            onOpenChange={setShowShareModal}
            isAnonymous={isAnonymous}
            setIsAnonymous={setIsAnonymous}
            broadcastScope={broadcastScope}
            setBroadcastScope={setBroadcastScope}
            targetGroup={targetGroup}
            setTargetGroup={setTargetGroup}
            memberGroups={memberGroups}
            campusName={campusInfo.name}
            campusPastor={campusInfo.pastor}
            allowedLevel={allowedBroadcastLevel}
            isSubmitting={submitting}
            onConfirm={handleConfirmShare}
          />

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Button variant="default" size="sm">All Prayers</Button>
            <Button variant="outline" size="sm">Recent</Button>
            <Button variant="outline" size="sm">Most Prayed</Button>
            <Button variant="outline" size="sm">Health</Button>
            <Button variant="outline" size="sm">Family</Button>
            <Button variant="outline" size="sm">Career</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-prayer" />
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No prayer requests found. Be the first to share one!
            </div>
          ) : (
            <div className="space-y-6">
              {prayers.map((request) => {
                const hasPrayed = request.prayedBy && sessionMember && request.prayedBy.includes(sessionMember.id || sessionMember._id || '');
                return (
                <Card key={request.id} className="hover:shadow-elevated transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${categoryColors[request.category as keyof typeof categoryColors] || categoryColors.General} text-xs`}>
                            {request.category || 'General'}
                          </Badge>
                          {request.privacy !== 'public' && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Shield className="w-3 h-3" />
                              {request.privacy === 'members' ? 'Members' : 'Staff Only'}
                            </Badge>
                          )}
                          {request.isAnonymous && (
                            <Badge variant="outline" className="text-xs gap-1 border-purple-500/20 text-purple-700 dark:text-purple-300 bg-purple-500/5">
                              <EyeOff className="w-3 h-3" /> Anonymous
                            </Badge>
                          )}
                          {request.targetGroups && request.targetGroups.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1 border-primary/20 text-primary bg-primary/5 font-medium">
                              <Radio className="w-3 h-3" /> {request.targetGroups.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {request.isAnonymous ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>By Anonymous</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>By {request.authorName || 'Member'}</span>
                              </>
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateMonthTime(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                      {request.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="gap-2 cursor-default">
                          <MessageCircle className="w-4 h-4" />
                          <span>{request.comments} comments</span>
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 transition-colors ${
                          hasPrayed
                          ? 'bg-[#FBE8E8] text-[#8B2323] border-[#8B2323]/20'
                          : 'bg-prayer/5 border-prayer/20 hover:bg-prayer/10'
                        }`}
                        onClick={() => handlePray(request.id)}
                      >
                        <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-current' : ''}`} />
                        {hasPrayed ? 'Prayed' : 'I Prayed'} • {request.prayedCount}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --- SHARE SETTINGS MODAL (Anonymous & Campus Leader Broadcast Settings) ---
interface PrayerShareSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAnonymous: boolean;
  setIsAnonymous: (val: boolean) => void;
  broadcastScope: 'all_campuses' | 'campus' | 'group';
  setBroadcastScope: (val: 'all_campuses' | 'campus' | 'group') => void;
  targetGroup: string;
  setTargetGroup: (val: string) => void;
  memberGroups: string[];
  campusName?: string;
  campusPastor?: string;
  allowedLevel: 'all_campuses' | 'campus_only' | 'group_only';
  isSubmitting: boolean;
  onConfirm: () => void;
}

function PrayerShareSettingsModal({
  open,
  onOpenChange,
  isAnonymous,
  setIsAnonymous,
  broadcastScope,
  setBroadcastScope,
  targetGroup,
  setTargetGroup,
  memberGroups,
  campusName,
  campusPastor,
  allowedLevel,
  isSubmitting,
  onConfirm,
}: PrayerShareSettingsModalProps) {
  const displayCampusTitle = campusName
    ? (campusName.toLowerCase().startsWith('within ') ? campusName : `Within ${campusName}`)
    : 'Within Local Campus';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] border-[#E5D5C5] shadow-2xl max-h-[min(90dvh,90%)] overflow-y-auto max-sm:top-1/2 max-sm:-translate-y-1/2">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#8B2323]/10 flex items-center justify-center text-[#8B2323]">
              <Radio className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#3A2D27]">
              Share Prayer Settings
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Setting 1: Anonymous Identity */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E5D5C5] shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5] flex items-center justify-center text-[#8B2323] shrink-0">
                  <EyeOff className="w-4 h-4" />
                </div>
                <label htmlFor="modal-anon-toggle" className="text-sm font-semibold text-[#3A2D27] cursor-pointer">
                  Post Anonymously
                </label>
              </div>
              <input
                id="modal-anon-toggle"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded accent-[#8B2323] cursor-pointer"
              />
            </div>
          </div>

          {/* Setting 2: Broadcasting Target */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#7A6150] uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#8B2323]" />
                Broadcasting Scope
              </label>
              <span className="text-[10px] font-semibold text-[#8B2323] bg-[#FBE8E8] px-2 py-0.5 rounded-full">
                {allowedLevel === 'all_campuses'
                  ? 'All Campuses Allowed'
                  : allowedLevel === 'campus_only'
                  ? 'Local Campus Allowed'
                  : 'Groups Only'}
              </span>
            </div>

            <div className="space-y-2">
              {/* Option A: All Campuses */}
              <button
                type="button"
                disabled={allowedLevel !== 'all_campuses'}
                onClick={() => {
                  setBroadcastScope('all_campuses');
                  setTargetGroup('all');
                }}
                className={cn(
                  "w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3",
                  broadcastScope === 'all_campuses'
                    ? "bg-[#FBE8E8]/70 border-[#8B2323] shadow-xs"
                    : "bg-white border-[#E5D5C5] hover:bg-[#FAF7F2]",
                  allowedLevel !== 'all_campuses' && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                    broadcastScope === 'all_campuses' ? "bg-[#8B2323] text-white" : "bg-[#FAF7F2] text-[#7A6150]"
                  )}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-[#3A2D27] flex items-center gap-1.5">
                    All Church Campuses (Global Wall)
                    {allowedLevel !== 'all_campuses' && <Lock className="w-3 h-3 text-gray-400" />}
                  </p>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  broadcastScope === 'all_campuses' ? "border-[#8B2323] bg-[#8B2323]" : "border-gray-300"
                )}>
                  {broadcastScope === 'all_campuses' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option B: Within Campus */}
              <button
                type="button"
                disabled={allowedLevel === 'group_only'}
                onClick={() => {
                  setBroadcastScope('campus');
                  setTargetGroup('all');
                }}
                className={cn(
                  "w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3",
                  broadcastScope === 'campus'
                    ? "bg-[#FBE8E8]/70 border-[#8B2323] shadow-xs"
                    : "bg-white border-[#E5D5C5] hover:bg-[#FAF7F2]",
                  allowedLevel === 'group_only' && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                    broadcastScope === 'campus' ? "bg-[#8B2323] text-white" : "bg-[#FAF7F2] text-[#7A6150]"
                  )}>
                    <Church className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-[#3A2D27] flex items-center gap-1.5">
                    {displayCampusTitle}
                    {allowedLevel === 'group_only' && <Lock className="w-3 h-3 text-gray-400" />}
                  </p>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  broadcastScope === 'campus' ? "border-[#8B2323] bg-[#8B2323]" : "border-gray-300"
                )}>
                  {broadcastScope === 'campus' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option C: Specific Group */}
              <button
                type="button"
                onClick={() => {
                  setBroadcastScope('group');
                  if (targetGroup === 'all' && memberGroups.length > 0) {
                    setTargetGroup(memberGroups[0]);
                  }
                }}
                className={cn(
                  "w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3",
                  broadcastScope === 'group'
                    ? "bg-[#FBE8E8]/70 border-[#8B2323] shadow-xs"
                    : "bg-white border-[#E5D5C5] hover:bg-[#FAF7F2]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                    broadcastScope === 'group' ? "bg-[#8B2323] text-white" : "bg-[#FAF7F2] text-[#7A6150]"
                  )}>
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-[#3A2D27]">
                    Specific Group in Campus
                  </p>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  broadcastScope === 'group' ? "border-[#8B2323] bg-[#8B2323]" : "border-gray-300"
                )}>
                  {broadcastScope === 'group' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Group Dropdown when group scope active */}
              {broadcastScope === 'group' && (
                <div className="p-3 bg-white rounded-2xl border border-[#8B2323]/30 space-y-1.5 ml-2">
                  <label className="text-[11px] font-bold text-[#3A2D27] block">
                    Select Fellowship Group:
                  </label>
                  {memberGroups.length > 0 ? (
                    <select
                      value={targetGroup === 'all' ? memberGroups[0] : targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      className="w-full text-xs border rounded-xl p-2.5 bg-[#FAF7F2] border-[#E5D5C5] text-[#3A2D27] focus:outline-none focus:ring-2 focus:ring-[#8B2323]/20"
                    >
                      {memberGroups.map((grp: string) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-[#8B2323]">
                      You have not been assigned to a fellowship group yet. The prayer will be routed to campus leaders.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-[#E5D5C5]/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl border-[#E5D5C5] text-[#7A6150]"
          >
            Back / Edit
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="w-full sm:flex-1 bg-[#8B2323] hover:bg-[#6b1b1b] text-white rounded-xl font-semibold gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Confirm & Share Prayer
                <Send className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- PAGE LAYOUT (Original Page UI) ---
function PrayerWallPageLayout() {
  const { session, getSessionMember } = useAuth();
  const sessionMember = getSessionMember();
  const { campuses: adminCampuses } = useAdminData();
  const [campuses, setCampuses] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const deepId = searchParams?.get('prayer') || searchParams?.get('id');
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
  const [campusFilter, setCampusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [broadcastScope, setBroadcastScope] = useState<'all_campuses' | 'campus' | 'group'>('all_campuses');
  const [targetGroup, setTargetGroup] = useState<string>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrolledRef = React.useRef(false);

  useEffect(() => {
    fetch('/api/campuses')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCampuses(data.map(c => ({
            id: c._id || c.id,
            _id: c._id || c.id,
            name: c.name,
            pastor: c.pastor || c.pastorName,
            prayerBroadcastLevel: c.prayerBroadcastLevel,
          })));
        }
      })
      .catch(console.error);
  }, []);

  const allCampuses = campuses.length > 0 ? campuses : adminCampuses;
  const memberGroups = sessionMember?.groups || session?.groups || [];
  const userCampusRaw = sessionMember?.campusId || session?.campusId || (sessionMember as any)?.campus;
  const userCampusNameRaw = (sessionMember as any)?.campusName || (session as any)?.campusName;
  const campusInfo = resolveCampusInfo(allCampuses, userCampusRaw, userCampusNameRaw);
  const currentCampus = campusInfo.campus;
  const userCampusId = currentCampus?.id || currentCampus?._id || userCampusRaw;
  const allowedBroadcastLevel: 'all_campuses' | 'campus_only' | 'group_only' = campusInfo.allowedLevel;

  useEffect(() => {
    fetch('/api/prayers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublicPrayers(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!deepId) return;
    const cleanId = String(deepId).trim();
    setHighlightedId(cleanId);
    if (!scrolledRef.current && publicPrayers.length > 0) {
      scrolledRef.current = true;
      const timer = setTimeout(() => {
        const el = document.getElementById(`prayer-${cleanId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      const fadeTimer = setTimeout(() => setHighlightedId(null), 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [deepId, publicPrayers]);

  const handleOpenShareModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and prayer request");
      return;
    }

    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    if (content.trim().length < 3) {
      toast.error("Prayer request must be at least 3 characters");
      return;
    }

    // Set initial broadcast scope according to campus leader rules
    if (allowedBroadcastLevel === 'group_only') {
      setBroadcastScope('group');
      if (targetGroup === 'all' && memberGroups.length > 0) {
        setTargetGroup(memberGroups[0]);
      }
    } else if (allowedBroadcastLevel === 'campus_only' && broadcastScope === 'all_campuses') {
      setBroadcastScope('campus');
    }

    setShowShareModal(true);
  };

  const handleConfirmShare = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.slice(0, PRAYER_FIELD_LIMITS.title),
          content: content.slice(0, PRAYER_FIELD_LIMITS.content),
          authorId: session?.memberId,
          authorName: session?.name,
          campusId: userCampusId,
          isAnonymous,
          broadcastScope,
          targetCampuses: broadcastScope === 'all_campuses' ? ['all'] : userCampusId ? [userCampusId] : [],
          targetGroups: broadcastScope === 'group' && targetGroup !== 'all' ? [targetGroup] : [],
        }),
      });

      if (res.ok) {
        toast.success("Prayer request submitted for approval");
        setShowShareModal(false);
        setSubmitted(true);
        setTitle("");
        setContent("");
        setIsAnonymous(false);
        setBroadcastScope('all_campuses');
        setTargetGroup('all');
        fetch('/api/prayers')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setPublicPrayers(data);
          })
          .catch(console.error);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.details?.[0]?.message || errData.error || "Failed to submit prayer request");
      }
    } catch (err) {
      console.error("Failed to submit prayer", err);
      toast.error("An unexpected error occurred while submitting prayer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const broadcastGroupOptions = Array.from(
    new Set(
      publicPrayers.flatMap((p: any) => (Array.isArray(p.targetGroups) ? p.targetGroups : []))
    )
  );

  const visiblePrayers = publicPrayers
    .filter((p: any) => p.status === "approved" || p.status === undefined)
    .filter((p: any) => campusFilter === "all" || String(p.campusId || "") === campusFilter)
    .filter((p: any) => {
      if (groupFilter === "all") return true;
      return Array.isArray(p.targetGroups) && p.targetGroups.includes(groupFilter);
    })
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="py-4 md:py-6">
      <div className="grid md:grid-cols-5 gap-8">
        {/* Submit Prayer Form */}
        <div className="md:col-span-2">
          <div className="sticky top-24">
            <Card className="p-6 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-sm rounded-3xl">
              <h2 className="text-xl font-bold text-[#1A202C] mb-4">Submit a Request</h2>
              
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-8"
                  >
                    <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Prayer Shared</h3>
                    <p className="text-sm text-[#7A6150] mb-6">Your prayer request has been submitted to the community.</p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Submit Another
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleOpenShareModal} 
                    className="space-y-4"
                  >
                    <div>
                      <input
                        type="text"
                        className="w-full bg-[#FAF7F2] border border-[#E5D5C5] rounded-2xl p-4 text-[#3A2D27] placeholder:text-[#a59d94] focus:outline-none focus:ring-2 focus:ring-[#8B2323]/20 mb-4"
                        placeholder="Prayer request title"
                        value={title}
                        maxLength={PRAYER_FIELD_LIMITS.title}
                        onChange={(e) => setTitle(e.target.value.slice(0, PRAYER_FIELD_LIMITS.title))}
                        required
                        minLength={3}
                      />
                      <textarea 
                        className="w-full bg-[#FAF7F2] border border-[#E5D5C5] rounded-2xl p-4 text-[#3A2D27] placeholder:text-[#a59d94] focus:outline-none focus:ring-2 focus:ring-[#8B2323]/20 resize-none"
                        rows={5}
                        placeholder="How can we pray for you?"
                        value={content}
                        maxLength={PRAYER_FIELD_LIMITS.content}
                        onChange={(e) => setContent(e.target.value.slice(0, PRAYER_FIELD_LIMITS.content))}
                        required
                        minLength={3}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !content.trim()}
                      className="w-full bg-[#8B2323] hover:bg-[#6b1b1b] text-white rounded-xl py-6 font-semibold shadow-md active:scale-98 transition-all"
                    >
                      {isSubmitting ? "Submitting..." : (
                        <span className="flex items-center gap-2">
                          Share Prayer <Send className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </Card>

            {/* Share Settings Dialog (Anonymous & Broadcasting Scope) */}
            <PrayerShareSettingsModal
              open={showShareModal}
              onOpenChange={setShowShareModal}
              isAnonymous={isAnonymous}
              setIsAnonymous={setIsAnonymous}
              broadcastScope={broadcastScope}
              setBroadcastScope={setBroadcastScope}
              targetGroup={targetGroup}
              setTargetGroup={setTargetGroup}
              memberGroups={memberGroups}
              campusName={campusInfo.name}
              campusPastor={campusInfo.pastor}
              allowedLevel={allowedBroadcastLevel}
              isSubmitting={isSubmitting}
              onConfirm={handleConfirmShare}
            />
          </div>
        </div>

        {/* Community Prayers Feed */}
        <div className="md:col-span-3 space-y-4">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">
              Community Prayers
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl border-[#E5D5C5]/60 bg-[#FAF7F2] text-sm text-[#1A202C]">
                  <SelectValue placeholder="Filter by Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {broadcastGroupOptions.length > 0 && (
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl border-[#E5D5C5]/60 bg-[#FAF7F2] text-sm text-[#1A202C]">
                    <SelectValue placeholder="Filter by Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {broadcastGroupOptions.map((grp: string) => (
                      <SelectItem key={grp} value={grp}>
                        {grp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {visiblePrayers.length === 0 ? (
            <div className="text-center py-12 bg-white/40 rounded-3xl border border-[#F3EAE1] border-dashed">
              <Heart className="w-12 h-12 text-[#E5D5C5] mx-auto mb-3" />
              <p className="text-[#7A6150]">
                {campusFilter === "all"
                  ? "No prayer requests at the moment."
                  : "No prayer requests for this campus."}
              </p>
            </div>
          ) : (
            visiblePrayers.map((prayer: any) => {
              const pId = String(prayer.id || prayer._id || '');
              const isHighlighted = highlightedId === pId;
              return (
                <PrayerPageCard
                  key={prayer.id || prayer._id}
                  prayer={prayer}
                  session={session}
                  isHighlighted={isHighlighted}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PrayerPageCard({ prayer, session, isHighlighted = false }: { prayer: any; session: any; isHighlighted?: boolean }) {
  const [prayedCount, setPrayedCount] = useState(prayer.prayedCount || 0);
  const [hasPrayed, setHasPrayed] = useState(
    prayer.prayedBy && session && prayer.prayedBy.includes(session.memberId)
  );

  const handlePray = async () => {
    const next = !hasPrayed;
    setHasPrayed(next);
    setPrayedCount((prev: number) => Math.max(0, prev + (next ? 1 : -1)));

    try {
      const res = await fetch(`/api/prayers/${prayer.id}/pray`, { method: 'POST' });
      
      if (!res.ok) {
        setHasPrayed(!next);
        setPrayedCount((prev: number) => Math.max(0, prev + (next ? -1 : 1)));
        return;
      }

      const data = await res.json();
      setHasPrayed(Boolean(data.prayed));
      setPrayedCount(data.prayedCount);
    } catch (err) {
      setHasPrayed(!next);
      setPrayedCount((prev: number) => Math.max(0, prev + (next ? -1 : 1)));
    }
  };

  const pId = String(prayer.id || prayer._id || '');
  const targetGrps = Array.isArray(prayer.targetGroups) ? prayer.targetGroups : [];

  return (
    <motion.div 
      id={`prayer-${pId}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl backdrop-blur-sm transition-all duration-500 border ${
        isHighlighted
          ? 'bg-[#FFF9F9] border-[#8B2323] ring-2 ring-[#8B2323]/50 shadow-lg'
          : 'bg-white/60 border-white shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-[#8B2323] tracking-wider uppercase bg-[#FBE8E8] px-2 py-1 rounded-sm">
          {formatDateMonthTime(prayer.createdAt || Date.now())}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {prayer.isAnonymous && (
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Anonymous
            </span>
          )}
          {targetGrps.length > 0 && (
            <span className="text-[10px] font-bold text-[#8B2323] bg-[#FBE8E8] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3" /> {targetGrps.join(', ')}
            </span>
          )}
        </div>
      </div>
      <p className="text-[#3A2D27] leading-relaxed mb-4 whitespace-pre-wrap">{prayer.content}</p>
      
      <div className="flex items-center justify-between border-t border-[#F3EAE1] pt-4">
        <div className="flex items-center text-sm font-semibold text-[#8B2323]">
          {prayer.isAnonymous ? (
            <>
              <EyeOff className="w-4 h-4 mr-1.5 text-muted-foreground" />
              <span className="text-muted-foreground">Anonymous</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 mr-1.5" />
              <span>{prayer.authorName || 'Anonymous'}</span>
            </>
          )}
        </div>
        
        <button 
          onClick={handlePray}
          className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-colors ${
            hasPrayed 
            ? 'bg-[#FBE8E8] text-[#8B2323]' 
            : 'bg-[#F3EAE1] text-[#7A6150] hover:bg-[#E5D5C5] active:scale-95'
          }`}
        >
          <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-current' : ''}`} />
          {hasPrayed ? 'Prayed' : 'I Prayed'} • {prayedCount}
        </button>
      </div>
    </motion.div>
  );
}