"use client";

import React from "react";
import { AnnouncementsSection } from "@/components/ui/announcements-section";
import { AuthGate } from "@/components/ui/auth-gate";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-transparent pb-4 md:pb-12 text-[#3A2D27]">
      <div className="px-4 pt-4 md:px-0 md:pt-24">
        <AuthGate title="Announcements" className="mt-4 md:mt-8">
          <AnnouncementsSection />
        </AuthGate>
      </div>
    </div>
  );
}
