"use client";

import React from "react";
import { Navigation } from "@/components/ui/navigation";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { AnnouncementsSection } from "@/components/ui/announcements-section";
import { AuthGate } from "@/components/ui/auth-gate";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <Navigation />
      <div className="pt-16 px-4 md:px-0">
        <AuthGate title="Announcements" className="mt-8 md:mt-24">
          <AnnouncementsSection />
        </AuthGate>
      </div>
      <MobileBottomNav />
    </div>
  );
}
