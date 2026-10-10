"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { AnnouncementsSection } from "@/components/ui/announcements-section";
import { AuthGate } from "@/components/ui/auth-gate";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";

export default function AnnouncementsPage() {
  const { goBack } = useNavigationHistory();

  // Mark announcements as visited when user views this page
  React.useEffect(() => {
    try {
      localStorage.setItem('grace_visited_announcements', String(Date.now()));
      fetch('/api/notifications')
        .then(res => res.ok ? res.json() : [])
        .then((notifs: any[]) => {
          if (!Array.isArray(notifs)) return;
          const annNotifs = notifs.filter(n => n.type === 'new_announcement' || n.type === 'recurring_announcement');
          const ids = annNotifs.flatMap(n => [n._id, n.sourceId ? `ann-${n.sourceId}` : null]).filter(Boolean) as string[];
          if (ids.length > 0) {
            const current: string[] = JSON.parse(localStorage.getItem('grace_dismissed_notifications') || '[]');
            const updated = Array.from(new Set([...current, ...ids]));
            localStorage.setItem('grace_dismissed_notifications', JSON.stringify(updated));
            const dbIds = annNotifs.map(n => n._id).filter(Boolean);
            if (dbIds.length > 0) {
              fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: dbIds })
              }).catch(() => {});
            }
          }
        }).catch(() => {});
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <div className="container mx-auto px-4 sm:px-6 page-back-offset pb-2">
        <div className="page-back-bar mb-2">
          <Button
            onClick={() => goBack("/")}
            variant="ghost"
            className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Announcements</span>
          </Button>
        </div>
      </div>
      <div className="px-4 md:px-0">
        <AuthGate title="Announcements" showBack={false} variant="embed" className="mx-auto max-w-4xl">
          <AnnouncementsSection />
        </AuthGate>
      </div>
    </div>
  );
}
