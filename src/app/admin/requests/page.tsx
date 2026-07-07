"use client";

import React, { useState } from 'react';
import { useAuth, type ChurchMember } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

  const recentlyProcessed = members.filter(m =>
    (m.status === 'approved' || m.status === 'rejected') && m.qrCode !== undefined
  ).slice(-5);

  // Approve dialog
  const [approveDialog, setApproveDialog] = useState<ChurchMember | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

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

  const handleReject = (id: string) => {
    rejectMember(id);
    setRejectConfirm(null);
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Registration Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve new member registrations
          {isCampusLeader && (
            <span className="text-amber-500"> · Showing requests for {campuses.find(c => c.id === currentUser.campusId)?.name}</span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{pendingRequests.length}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{members.filter(m => m.status === 'approved').length}</p>
              <p className="text-[10px] text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{members.filter(m => m.status === 'rejected').length}</p>
              <p className="text-[10px] text-muted-foreground">Rejected</p>
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
          {pendingRequests.map(member => (
            <Card key={member.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}
                        </h3>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {member.phone}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(member.birthday)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" /> {campuses.find(c => c.id === member.campusId)?.name}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-3.5 h-3.5" /> {member.gender === 'male' ? 'Male' : 'Female'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Heart className="w-3.5 h-3.5" /> {member.maritalStatus === 'married' ? 'Married' : 'Single'}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Submitted {formatDate(member.createdAt)}
                    </p>
                    {/* Family link indicator */}
                    {member.familyMemberId && (() => {
                      const familyMember = getMember(member.familyMemberId);
                      return familyMember ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Link2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-600">
                            Linked to: {familyMember.firstName} {familyMember.lastName}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => openApproveDialog(member)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => setRejectConfirm(member.id)}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog — assign groups */}
      <Dialog open={approveDialog !== null} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve & Assign Groups</DialogTitle>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">
                  {approveDialog.firstName} {approveDialog.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{approveDialog.email}</p>
                <p className="text-xs text-muted-foreground">
                  {campuses.find(c => c.id === approveDialog.campusId)?.name}
                </p>
                {/* Family link info in approve dialog */}
                {approveDialog.familyMemberId && (() => {
                  const familyMember = getMember(approveDialog.familyMemberId);
                  return familyMember ? (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-600">Family linked to:</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {familyMember.firstName} {familyMember.lastName} ({familyMember.email})
                        </p>
                      </div>
                    </div>
                  ) : null;
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
                      <div className="grid grid-cols-2 gap-2">
                        {groupScopes.filter(g => g.scope === 'global').map(g => (
                          <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
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
                      <div className="grid grid-cols-2 gap-2">
                        {groupScopes.filter(g => g.scope === approveDialog.campusId).map(g => (
                          <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
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

      {/* Reject Confirm */}
      <Dialog open={rejectConfirm !== null} onOpenChange={() => setRejectConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Registration?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This member will not be able to sign in. This can be reversed later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectConfirm && handleReject(rejectConfirm)}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
