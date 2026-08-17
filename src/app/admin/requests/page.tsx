"use client";

import React, { useState } from 'react';
import { useAuth, type ChurchMember } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  UserPlus, Clock, CheckCircle, XCircle, Mail, Phone, Calendar,
  Building2, Heart, User, Users, Link2,
} from 'lucide-react';
import { RejectMemberDialog } from '@/components/ui/reject-member-dialog';
import { toast } from 'sonner';

function isLinkedPlaceholderEmail(email?: string) {
  return !!email && (email.startsWith('linked_') || email.endsWith('@family.internal'));
}

function getMemberDisplayName(member: Pick<ChurchMember, 'firstName' | 'middleName' | 'lastName' | 'name'>) {
  const fromParts = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  if (member.name && !String(member.name).startsWith('linked_')) return member.name;
  return 'Unknown member';
}

export default function RequestsPage() {
  const { session, members, getPendingRequests, approveMember, rejectMember, getMember } = useAuth();
  const { campuses, groupScopes, currentUser } = useAdminData();

  const isCampusLeader = currentUser.role === 'campus_leader';
  const pendingRequests = (isCampusLeader
    ? getPendingRequests(currentUser.campusId)
    : getPendingRequests()
  ).filter(member => {
    // If the member was added by an admin, only show it to the admin who created them
    if (member.createdBy) {
      return member.createdBy === session?.memberId;
    }
    return true;
  });

  // Approve dialog
  const [approveDialog, setApproveDialog] = useState<ChurchMember | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [rejectTarget, setRejectTarget] = useState<ChurchMember | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const openApproveDialog = (member: ChurchMember) => {
    setApproveDialog(member);
    setSelectedGroups([]);
  };

  const handleApprove = () => {
    if (!approveDialog) return;
    approveMember(approveDialog.id, selectedGroups);
    setApproveDialog(null);
    setSelectedGroups([]);
  };

  const handleReject = async (payload: { rejectionReason: string; rejectionNote?: string }) => {
    if (!rejectTarget) return;
    setRejecting(true);
    const res = await rejectMember(rejectTarget.id, payload);
    setRejecting(false);
    if (res.success) {
      toast.success('Registration rejected');
      setRejectTarget(null);
    } else {
      toast.error(res.error || 'Failed to reject');
    }
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const getLinkedParent = (member: ChurchMember) => {
    if (member.parentAccountId) {
      const parent = getMember(member.parentAccountId) || members.find(m => m.id === member.parentAccountId);
      if (parent) return parent;
    }
    if (member.familyMemberId) {
      return getMember(member.familyMemberId) || members.find(m => m.id === member.familyMemberId) || null;
    }
    return null;
  };

  const isFamilyProfile = (member: ChurchMember) =>
    !!member.isLinkedProfile || isLinkedPlaceholderEmail(member.email) || !!member.parentAccountId;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Registration Requests</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Review and approve new member registrations
          {isCampusLeader && (
            <span className="text-amber-500"> · Showing requests for {campuses.find(c => c.id === currentUser.campusId)?.name}</span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-border/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold leading-none">{pendingRequests.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold leading-none">{members.filter(m => m.status === 'approved').length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold leading-none">{members.filter(m => m.status === 'rejected').length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(member => {
            const displayName = getMemberDisplayName(member);
            const linkedParent = getLinkedParent(member);
            const showRealEmail = member.email && !isLinkedPlaceholderEmail(member.email);

            return (
              <Card key={member.id} className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base leading-tight truncate">
                            {displayName}
                          </h3>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                          </Badge>
                        </div>

                        {showRealEmail ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 min-w-0">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </p>
                        ) : isFamilyProfile(member) ? (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1.5 min-w-0">
                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {linkedParent
                                ? `Family linked to ${getMemberDisplayName(linkedParent)}`
                                : 'Family linked profile'}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {member.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{formatDate(member.birthday)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{campuses.find(c => c.id === member.campusId)?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span>{member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Heart className="w-3.5 h-3.5 shrink-0" />
                        <span>{member.maritalStatus === 'married' ? 'Married' : member.maritalStatus === 'single' ? 'Single' : '—'}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Submitted {formatDate(member.createdAt)}
                    </p>

                    <div className="flex gap-2 w-full sm:w-auto sm:self-end">
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none gap-1"
                        onClick={() => openApproveDialog(member)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-none gap-1"
                        onClick={() => setRejectTarget(member)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve Dialog — assign groups */}
      <Dialog open={approveDialog !== null} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve & Assign Groups</DialogTitle>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">
                  {getMemberDisplayName(approveDialog)}
                </p>
                {approveDialog.email && !isLinkedPlaceholderEmail(approveDialog.email) && (
                  <p className="text-xs text-muted-foreground truncate">{approveDialog.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {campuses.find(c => c.id === approveDialog.campusId)?.name}
                </p>
                {/* Family link info in approve dialog */}
                {(() => {
                  const linkedParent = getLinkedParent(approveDialog);
                  if (!isFamilyProfile(approveDialog) && !approveDialog.familyMemberId) return null;
                  return (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-600">Family linked to:</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {linkedParent
                            ? getMemberDisplayName(linkedParent)
                            : 'Family linked profile'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Assign to Groups *
                </Label>
                <p className="text-xs text-muted-foreground">Select one or more groups for this member</p>
                <div className="space-y-4">
                  {/* Global Groups */}
                  {groupScopes.filter(g => g.scope === 'global').length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Groups</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupScopes.filter(g => g.scope === 'global').map(g => (
                          <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-0">
                            <Checkbox
                              checked={selectedGroups.includes(g.name)}
                              onCheckedChange={() => toggleGroup(g.name)}
                            />
                            <span className="truncate">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campus Groups */}
                  {groupScopes.filter(g => g.scope === approveDialog.campusId).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campus Groups</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupScopes.filter(g => g.scope === approveDialog.campusId).map(g => (
                          <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-0">
                            <Checkbox
                              checked={selectedGroups.includes(g.name)}
                              onCheckedChange={() => toggleGroup(g.name)}
                            />
                            <span className="truncate">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={selectedGroups.length === 0} className="gap-1">
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectMemberDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        memberName={rejectTarget ? getMemberDisplayName(rejectTarget) : undefined}
        loading={rejecting}
        onConfirm={handleReject}
      />
    </div>
  );
}
