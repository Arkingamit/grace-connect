"use client";

import React, { useState } from 'react';
import { useAdminData, getAllowedGroups, getAllowedCampuses, hasGlobalScope } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock, CheckCircle, XCircle, Heart, User, Shield, MessageCircle, Trash2,
  Radio, EyeOff, UserCheck, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { SendNotificationOption } from '@/components/admin/send-notification-option';

export default function PrayerRequestsPage() {
  const { prayerRequests, campuses, groupScopes, currentUser, approvePrayerRequest, deletePrayerRequest } = useAdminData();

  const isGlobal = hasGlobalScope(currentUser, 'prayers');
  const allowedCampuses = getAllowedCampuses(currentUser, campuses, 'prayers');
  const allowedCampusIds = allowedCampuses.map(c => c.id);
  const availableGroups = getAllowedGroups(currentUser, groupScopes);
  const isCampusLeader = currentUser.role === 'campus_leader' || (!isGlobal && allowedCampuses.length === 1);
  
  // Filter based on role & campus permissions
  const visiblePrayers = isGlobal
    ? prayerRequests
    : prayerRequests.filter(p => !p.campusId || allowedCampusIds.includes(p.campusId));

  const pendingPrayers = visiblePrayers.filter(p => p.status === 'pending');
  const approvedPrayers = visiblePrayers.filter(p => p.status === 'approved');

  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [notifyOnApprove, setNotifyOnApprove] = useState<Record<string, boolean>>({});
  const [broadcastGroupsByPrayer, setBroadcastGroupsByPrayer] = useState<Record<string, string[]>>({});

  const getSelectedGroups = (prayer: any): string[] => {
    if (broadcastGroupsByPrayer[prayer.id] !== undefined) {
      return broadcastGroupsByPrayer[prayer.id];
    }
    return Array.isArray(prayer.targetGroups) ? prayer.targetGroups : [];
  };

  const toggleGroupForPrayer = (prayerId: string, groupName: string) => {
    setBroadcastGroupsByPrayer((prev) => {
      const current = prev[prayerId] !== undefined
        ? prev[prayerId]
        : (prayerRequests.find(p => p.id === prayerId)?.targetGroups || []);
      const next = current.includes(groupName)
        ? current.filter(g => g !== groupName)
        : [...current, groupName];
      return { ...prev, [prayerId]: next };
    });
  };

  const setAllCampusForPrayer = (prayerId: string) => {
    setBroadcastGroupsByPrayer((prev) => ({ ...prev, [prayerId]: [] }));
  };

  const handleApprove = async (id: string) => {
    try {
      const prayer = prayerRequests.find(p => p.id === id);
      const targetGroups = broadcastGroupsByPrayer[id] !== undefined
        ? broadcastGroupsByPrayer[id]
        : (prayer?.targetGroups || []);

      await approvePrayerRequest(id, {
        sendNotification: !!notifyOnApprove[id],
        targetGroups,
      });

      toast.success(
        notifyOnApprove[id]
          ? (targetGroups.length > 0 ? `Prayer approved & broadcasted to ${targetGroups.join(', ')}` : 'Prayer approved & campus notified')
          : 'Prayer request approved'
      );

      setNotifyOnApprove((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      toast.error('Failed to approve prayer request');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePrayerRequest(id);
      toast.success('Prayer request deleted');
    } catch (error) {
      toast.error('Failed to delete prayer request');
    }
    setRejectConfirm(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  const categoryColors: Record<string, string> = {
    Health: "bg-success/10 text-success border-success/20",
    Career: "bg-accent/10 text-accent-foreground border-accent/20",
    Relationships: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    Church: "bg-primary/10 text-primary border-primary/20",
    Family: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    General: "bg-gray-100 text-gray-800 border-gray-200"
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prayer Wall Management</h1>
        <p className="text-muted-foreground mt-1">
          Review, approve, and manage prayer requests and broadcasts from your congregation
          {!isGlobal && allowedCampuses.length > 0 && (
            <span className="text-amber-500">
              {' · Showing requests for '}
              {allowedCampuses.map(c => c.name).join(', ')}
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingPrayers.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedPrayers.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pending Requests Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Needs Approval
            </h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              {pendingPrayers.length}
            </Badge>
          </div>

          {pendingPrayers.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-xl border border-dashed border-border/50">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPrayers.map(prayer => {
                const targetGrps = getSelectedGroups(prayer);
                return (
                  <Card key={prayer.id} className="border-amber-500/20 bg-amber-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={categoryColors[prayer.category] || categoryColors.General}>
                              {prayer.category}
                            </Badge>
                            {prayer.privacy !== 'public' && (
                              <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary">
                                <Shield className="w-3 h-3" />
                                {prayer.privacy === 'members' ? 'Members Only' : 'Staff Only'}
                              </Badge>
                            )}
                            {prayer.isAnonymous && (
                              <Badge variant="outline" className="gap-1 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                <EyeOff className="w-3 h-3" /> Anonymous to Public
                              </Badge>
                            )}
                            {!isCampusLeader && (
                               <Badge variant="outline" className="text-[10px]">
                                 {campuses.find(c => c.id === prayer.campusId)?.name || 'Unknown Campus'}
                               </Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-lg leading-tight">{prayer.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5" /> 
                            {prayer.isAnonymous ? 'Anonymous (on wall)' : prayer.authorName}
                            <span className="text-border px-1">•</span>
                            {formatDate(prayer.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Submitter Details - Visible to Campus Leader during approval */}
                      {prayer.isAnonymous && (
                        <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 rounded-xl p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              Submitter Identity (Campus Leader View)
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium">
                              Hidden from public
                            </Badge>
                          </div>
                          <div className="text-foreground font-semibold text-sm">
                            {prayer.submitterName || 'Anonymous Submitter'}
                          </div>
                          {(prayer.submitterEmail || prayer.submitterPhone) && (
                            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs pt-0.5">
                              {prayer.submitterEmail && <span>Email: <strong className="text-foreground/90 font-medium">{prayer.submitterEmail}</strong></span>}
                              {prayer.submitterPhone && <span>Phone: <strong className="text-foreground/90 font-medium">{prayer.submitterPhone}</strong></span>}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-background/50 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-wrap border border-border/50">
                        {prayer.content}
                      </div>

                      {/* Campus Leader Broadcast Decision Section */}
                      <div className="bg-background/60 rounded-xl p-3.5 border border-border/60 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold flex items-center gap-1.5 text-foreground/90">
                            <Radio className="w-3.5 h-3.5 text-primary" />
                            Broadcasting Scope
                          </span>
                          <span className="text-muted-foreground font-medium">
                            {targetGrps.length === 0 ? 'All Campus Members' : `${targetGrps.length} group(s) selected`}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Decide which group has the right to see and receive push broadcasts for this prayer request:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setAllCampusForPrayer(prayer.id)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              targetGrps.length === 0
                                ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            All Campus Members
                          </button>
                          {availableGroups.map((grp) => {
                            const isSelected = targetGrps.includes(grp);
                            return (
                              <button
                                key={grp}
                                type="button"
                                onClick={() => toggleGroupForPrayer(prayer.id, grp)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {grp}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <SendNotificationOption
                          id={`notify-prayer-${prayer.id}`}
                          checked={!!notifyOnApprove[prayer.id]}
                          onChange={(send) => setNotifyOnApprove((prev) => ({ ...prev, [prayer.id]: send }))}
                          description={
                            targetGrps.length > 0
                              ? `Members of ${targetGrps.join(', ')} will get a push broadcast. Leave unchecked to approve quietly.`
                              : "Campus members will get a push broadcast. Leave unchecked to approve quietly."
                          }
                        />
                        <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => handleApprove(prayer.id)}
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Broadcast
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => setRejectConfirm(prayer.id)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Approved Requests Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Active on Wall
            </h2>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              {approvedPrayers.length}
            </Badge>
          </div>

          {approvedPrayers.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-xl border border-dashed border-border/50">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No active prayer requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedPrayers.map(prayer => {
                const targetGrps = Array.isArray(prayer.targetGroups) ? prayer.targetGroups : [];
                return (
                  <Card key={prayer.id} className="border-border/50 bg-card/30">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={categoryColors[prayer.category] || categoryColors.General}>
                              {prayer.category}
                            </Badge>
                            {prayer.privacy !== 'public' && (
                              <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary">
                                <Shield className="w-3 h-3" />
                                {prayer.privacy === 'members' ? 'Members Only' : 'Staff Only'}
                              </Badge>
                            )}
                            {prayer.isAnonymous && (
                              <Badge variant="outline" className="gap-1 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                <EyeOff className="w-3 h-3" /> Anonymous to Public
                              </Badge>
                            )}
                            {targetGrps.length > 0 ? (
                              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary font-medium">
                                <Radio className="w-3 h-3" /> Broadcast: {targetGrps.join(', ')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                All Campus
                              </Badge>
                            )}
                            {!isCampusLeader && (
                               <Badge variant="outline" className="text-[10px]">
                                 {campuses.find(c => c.id === prayer.campusId)?.name || 'Unknown Campus'}
                               </Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-lg leading-tight">{prayer.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5" /> 
                            {prayer.isAnonymous ? 'Anonymous' : prayer.authorName}
                            {prayer.isAnonymous && prayer.submitterName && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                (Leader view: {prayer.submitterName})
                              </span>
                            )}
                            <span className="text-border px-1">•</span>
                            {formatDate(prayer.createdAt)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                          onClick={() => setRejectConfirm(prayer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="bg-background/50 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-wrap border border-border/50">
                        {prayer.content}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-rose-500" />
                          <span className="font-medium">{prayer.prayedCount}</span> prayed
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-medium">{prayer.comments}</span> comments
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete/Reject Confirm */}
      <Dialog open={rejectConfirm !== null} onOpenChange={() => setRejectConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Prayer Request?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this prayer request? This action cannot be undone and it will be removed from the Prayer Wall immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectConfirm && handleDelete(rejectConfirm)}>
              Delete Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
