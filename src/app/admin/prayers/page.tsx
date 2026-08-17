"use client";

import React, { useState } from 'react';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock, CheckCircle, XCircle, Heart, User, Shield, MessageCircle, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function PrayerRequestsPage() {
  const { prayerRequests, campuses, currentUser, approvePrayerRequest, deletePrayerRequest } = useAdminData();

  const isCampusLeader = currentUser.role === 'campus_leader';
  
  // Filter based on role
  const visiblePrayers = isCampusLeader
    ? prayerRequests.filter(p => p.campusId === currentUser.campusId)
    : prayerRequests;

  const pendingPrayers = visiblePrayers.filter(p => p.status === 'pending');
  const approvedPrayers = visiblePrayers.filter(p => p.status === 'approved');

  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    try {
      await approvePrayerRequest(id);
      toast.success('Prayer request approved');
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
          Review, approve, and manage prayer requests from your congregation
          {isCampusLeader && (
            <span className="text-amber-500"> · Showing requests for {campuses.find(c => c.id === currentUser.campusId)?.name}</span>
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
              {pendingPrayers.map(prayer => (
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
                          <span className="text-border px-1">•</span>
                          {formatDate(prayer.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-background/50 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-wrap border border-border/50">
                      {prayer.content}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleApprove(prayer.id)}
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
                        onClick={() => setRejectConfirm(prayer.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              {approvedPrayers.map(prayer => (
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
              ))}
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
