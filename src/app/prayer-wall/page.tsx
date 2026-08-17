"use client";

import React from "react";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { PrayerWall } from "@/components/ui/prayer-wall";
import { AuthGate } from "@/components/ui/auth-gate";

export default function PrayerWallPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <main className="max-w-4xl mx-auto px-4 md:px-8">
        <AuthGate title="Prayer Wall" className="mt-8 md:mt-24">
          <PrayerWall variant="page" />
        </AuthGate>
      </main>
    </div>
  );
}
