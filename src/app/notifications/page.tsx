"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, Heart, Megaphone, User as UserIcon, Check, X, ShieldAlert } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { announcements } = useAdminData();
  const { session } = useAuth();
  
  const [pendingPrayers, setPendingPrayers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('grace_dismissed_notifications');
      if (stored) {
        try {
          setDismissedIds(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const updated = [...prev, id];
      localStorage.setItem('grace_dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
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
          setPendingUsers(users.filter(u => u.status === 'pending'));
        }
      }).catch(err => console.error("Error fetching admin approvals:", err))
      .finally(() => setLoading(false));
    }
  }, [session?.role]);

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

  const handleApproveUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
        toast.success("Member registration approved");
      } else {
        toast.error("Failed to approve member");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleRejectUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
        toast.success("Member registration rejected");
      } else {
        toast.error("Failed to reject member");
      }
    } catch (e) {
      toast.error("An error occurred");
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
        type: 'user-approval',
        title: 'Pending Member Registration',
        content: `${u.name || u.firstName + ' ' + u.lastName} (${u.email}) is requesting to join as a ${u.role}.`,
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
  }, [announcements, pendingPrayers, pendingUsers, dismissedIds]);

  return (
    <div className="min-h-screen bg-transparent pb-24">
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#E5D5C5]/40 shadow-sm pt-4 pb-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7A6150] shadow-sm shrink-0 hover:bg-[#F3EAE1] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-serif text-[#1A202C]">Notifications</h1>
            {notifications.length > 0 && (
              <span className="bg-[#8B2323] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
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
                <Card key={notif.id} className="p-4 border-0 shadow-sm bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col gap-3 hover:bg-white transition-colors duration-150">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notif.bgColor}`}>
                      <Icon className={`w-5 h-5 ${notif.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-[#1A202C] truncate pr-2">{notif.title}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-[#7A6150] whitespace-nowrap">
                            {notif.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {notif.type === 'announcement' && (
                            <button onClick={() => handleDismiss(notif.id)} className="text-[#7A6150]/50 hover:text-[#7A6150] transition-colors p-1 -mr-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                        onClick={() => notif.type === 'prayer-approval' ? handleApprovePrayer(notif.originalId) : handleApproveUser(notif.originalId)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                        onClick={() => notif.type === 'prayer-approval' ? handleRejectPrayer(notif.originalId) : handleRejectUser(notif.originalId)}
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
    </div>
  );
}
