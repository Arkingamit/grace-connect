"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, Megaphone, User as UserIcon, Check, X, ShieldAlert, Users, CheckCircle, Link2 } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RejectMemberDialog } from '@/components/ui/reject-member-dialog';

const DISMISSED_KEY = 'grace_dismissed_notifications';

function readDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeDismissedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export default function NotificationsPage() {
  const { announcements, campuses, groupScopes } = useAdminData();
  const { session } = useAuth();

  const [pendingPrayers, setPendingPrayers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [usersById, setUsersById] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [approveDialogUser, setApproveDialogUser] = useState<any | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const [rejectDialogUser, setRejectDialogUser] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    setDismissedIds(readDismissedIds());
  }, []);

  const persistDismissed = (idsToAdd: string[]) => {
    if (!idsToAdd.length) return;
    const updated = Array.from(new Set([...readDismissedIds(), ...idsToAdd]));
    writeDismissedIds(updated);
    setDismissedIds(updated);
  };

  useEffect(() => {
    // Only fetch pending approvals for campus leaders and admins
    if (session?.role === 'campus_leader' || session?.role === 'admin' || session?.role === 'super_admin') {
      setLoading(true);
      Promise.all([
        fetch('/api/admin/prayers').then(res => res.ok ? res.json() : []),
        fetch('/api/admin/users').then(res => res.ok ? res.json() : [])
      ]).then(([prayers, users]) => {
        if (Array.isArray(prayers)) {
          setPendingPrayers(prayers.filter(p => p.status === 'pending'));
        }
        if (Array.isArray(users)) {
          const byId: Record<string, any> = {};
          users.forEach((u: any) => {
            const id = String(u._id || u.id || '');
            if (id) byId[id] = u;
          });
          setUsersById(byId);
          setPendingUsers(users.filter((u: any) => u.status === 'pending'));
        }
      }).catch(err => console.error("Error fetching admin approvals:", err))
      .finally(() => setLoading(false));
    }
  }, [session?.role]);

  const getUserDisplayName = (u: any) => {
    const fromParts = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').trim();
    if (fromParts) return fromParts;
    if (u.name && !String(u.name).startsWith('linked_')) return u.name;
    return 'Unknown member';
  };

  const isLinkedPlaceholderEmail = (email?: string) =>
    !!email && (email.startsWith('linked_') || email.endsWith('@family.internal'));

  const getPendingUserMessage = (u: any) => {
    const displayName = getUserDisplayName(u);
    const parentId = u.parentAccountId ? String(u.parentAccountId) : '';
    const parent = parentId ? usersById[parentId] : null;
    const parentName = parent ? getUserDisplayName(parent) : null;
    const isLinked = u.isLinkedProfile || isLinkedPlaceholderEmail(u.email) || !!parentId;

    if (isLinked) {
      if (parentName) {
        return `${displayName} (family profile linked to ${parentName}) is requesting to join as a member.`;
      }
      return `${displayName} (family profile) is requesting to join as a member.`;
    }

    const emailPart = u.email && !isLinkedPlaceholderEmail(u.email) ? ` (${u.email})` : '';
    const roleLabel = u.role && u.role !== 'member'
      ? (u.role === 'group_leader'
          ? (u.campusId === 'global' ? 'Core Team leader' : 'FASL leader')
          : u.role.replace(/_/g, ' '))
      : 'member';
    return `${displayName}${emailPart} is requesting to join as a ${roleLabel}.`;
  };

  const handleApprovePrayer = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prayers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        setPendingPrayers(prev => prev.filter(p => p.id !== id && p._id !== id));
        toast.success("Prayer request approved");
      } else {
        toast.error("Failed to approve prayer");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleRejectPrayer = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prayers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        setPendingPrayers(prev => prev.filter(p => p.id !== id && p._id !== id));
        toast.success("Prayer request rejected");
      } else {
        toast.error("Failed to reject prayer");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const openApproveDialog = (userId: string) => {
    const user = pendingUsers.find(u => String(u._id || u.id) === String(userId));
    if (!user) {
      toast.error('Member details not found');
      return;
    }
    setApproveDialogUser(user);
    setSelectedGroups([]);
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const handleApproveUser = async () => {
    if (!approveDialogUser || selectedGroups.length === 0) return;
    const id = String(approveDialogUser._id || approveDialogUser.id);
    try {
      setApproving(true);
      const qrCode = crypto.randomUUID();
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', groups: selectedGroups, qrCode })
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => String(u.id) !== id && String(u._id) !== id));
        setApproveDialogUser(null);
        setSelectedGroups([]);
        toast.success('Member registration approved');
      } else {
        toast.error('Failed to approve member');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectUser = async (payload: { rejectionReason: string; rejectionNote?: string }) => {
    if (!rejectDialogUser) return;
    const id = String(rejectDialogUser.id || rejectDialogUser._id || '');
    if (!id) return;
    try {
      setRejecting(true);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: payload.rejectionReason,
          rejectionNote: payload.rejectionNote || '',
        }),
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => String(u.id) !== id && String(u._id) !== id));
        setRejectDialogUser(null);
        toast.success('Member registration rejected');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to reject member');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setRejecting(false);
    }
  };

  const notifications = useMemo(() => {
    const items: any[] = [];

    // Map Announcements to Notifications
    announcements.forEach((ann) => {
      // Check if announcement is expired
      if (ann.endDate) {
        let expirationDateObj;
        if (ann.endTime) {
          expirationDateObj = new Date(`${ann.endDate}T${ann.endTime}`);
        } else {
          expirationDateObj = new Date(`${ann.endDate}T23:59:59`);
        }
        if (expirationDateObj < new Date()) {
          return; // Skip expired announcements
        }
      }

      items.push({
        id: `ann-${ann.id}`,
        type: 'announcement',
        title: ann.title,
        content: ann.content,
        date: new Date(ann.createdAt || Date.now()),
        icon: Megaphone,
        color: 'text-[#8B2323]',
        bgColor: 'bg-[#FBE8E8]',
      });
    });

    // Map Pending Prayers
    pendingPrayers.forEach((pr: any) => {
      items.push({
        id: `pending-pr-${pr._id || pr.id}`,
        originalId: pr._id || pr.id,
        type: 'prayer-approval',
        title: 'Pending Prayer Request',
        content: pr.content || pr.description || 'A community member has shared a prayer request.',
        date: new Date(pr.createdAt || pr.date || Date.now()),
        icon: ShieldAlert,
        color: 'text-[#A04A00]',
        bgColor: 'bg-[#F3EAE1]',
      });
    });

    // Map Pending Users
    pendingUsers.forEach((u: any) => {
      items.push({
        id: `pending-user-${u._id || u.id}`,
        originalId: u._id || u.id,
        user: u,
        type: 'user-approval',
        title: 'Pending Member Registration',
        content: getPendingUserMessage(u),
        date: new Date(u.createdAt || Date.now()),
        icon: UserIcon,
        color: 'text-[#2D3748]',
        bgColor: 'bg-[#E2E8F0]',
      });
    });

    // Sort by date descending
    return items
      .filter(item => !dismissedIds.includes(item.id))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [announcements, pendingPrayers, pendingUsers, dismissedIds, usersById]);

  const handleDismissOne = (id: string) => {
    persistDismissed([id]);
  };

  const handleClearAll = () => {
    persistDismissed(notifications.map((n) => n.id));
  };

  return (
    <div className="min-h-screen bg-transparent pb-24">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#E5D5C5]/40 shadow-sm pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7A6150] shadow-sm shrink-0 hover:bg-[#F3EAE1] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="text-xl font-bold font-serif text-[#1A202C]">Notifications</h1>
            {notifications.length > 0 && (
              <span className="bg-[#8B2323] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#8B2323] shadow-sm transition-colors hover:bg-[#FBE8E8]"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 pt-6 space-y-4">
        {notifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-80">
            <div className="w-16 h-16 rounded-full bg-[#E5D5C5] flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-[#7A6150]" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#3A2D27]">You're all caught up!</h3>
            <p className="text-sm text-[#7A6150]">There are no new notifications at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const Icon = notif.icon;
              return (
                <Card key={notif.id} className="relative flex flex-col gap-3 rounded-2xl border-0 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white">
                  <button
                    type="button"
                    onClick={() => handleDismissOne(notif.id)}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#7A6150] transition-colors hover:bg-[#F3EAE1] hover:text-[#8B2323]"
                    aria-label="Remove notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notif.bgColor}`}>
                      <Icon className={`w-5 h-5 ${notif.color}`} />
                    </div>
                    <div className="min-w-0 flex-1 pr-7">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h4 className="truncate pr-2 text-sm font-bold text-[#1A202C]">{notif.title}</h4>
                        <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-[#7A6150]">
                          {notif.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A6150] leading-relaxed line-clamp-3">
                        {notif.content}
                      </p>
                    </div>
                  </div>

                  {/* Actionable Buttons for Approvals */}
                  {(notif.type === 'prayer-approval' || notif.type === 'user-approval') && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#F3EAE1]/50 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                        onClick={() => notif.type === 'prayer-approval' ? handleApprovePrayer(notif.originalId) : openApproveDialog(notif.originalId)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                        onClick={() =>
                          notif.type === 'prayer-approval'
                            ? handleRejectPrayer(notif.originalId)
                            : setRejectDialogUser(notif.user || pendingUsers.find((u) => String(u.id) === String(notif.originalId) || String(u._id) === String(notif.originalId)) || { id: notif.originalId })
                        }
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve & Assign Groups */}
      <Dialog open={approveDialogUser !== null} onOpenChange={(open) => { if (!open) { setApproveDialogUser(null); setSelectedGroups([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve & Assign Groups</DialogTitle>
          </DialogHeader>
          {approveDialogUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">
                  {getUserDisplayName(approveDialogUser)}
                </p>
                {approveDialogUser.email && !isLinkedPlaceholderEmail(approveDialogUser.email) && (
                  <p className="text-xs text-muted-foreground">{approveDialogUser.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {campuses.find(c => c.id === approveDialogUser.campusId)?.name || approveDialogUser.campusId}
                </p>
                {(approveDialogUser.parentAccountId || approveDialogUser.isLinkedProfile) && (() => {
                  const parentId = approveDialogUser.parentAccountId ? String(approveDialogUser.parentAccountId) : '';
                  const parent = parentId ? usersById[parentId] : null;
                  if (!parent) {
                    return (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Link2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <p className="text-xs font-medium text-emerald-600">Family linked profile</p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-600">Family linked to:</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getUserDisplayName(parent)}
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

                  {groupScopes.filter(g => g.scope === approveDialogUser.campusId).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campus Groups</p>
                      <div className="grid grid-cols-2 gap-2">
                        {groupScopes.filter(g => g.scope === approveDialogUser.campusId).map(g => (
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

                  {groupScopes.filter(g => g.scope === 'global' || g.scope === approveDialogUser.campusId).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No groups available for this campus.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialogUser(null); setSelectedGroups([]); }} disabled={approving}>
              Cancel
            </Button>
            <Button onClick={handleApproveUser} disabled={selectedGroups.length === 0 || approving} className="gap-1">
              <CheckCircle className="w-4 h-4" /> {approving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectMemberDialog
        open={rejectDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) setRejectDialogUser(null);
        }}
        memberName={rejectDialogUser ? getUserDisplayName(rejectDialogUser) : undefined}
        loading={rejecting}
        onConfirm={handleRejectUser}
      />
    </div>
  );
}
