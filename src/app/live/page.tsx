"use client";

import React from "react";
import { Navigation } from "@/components/ui/navigation";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { LiveStreamSection } from "@/components/ui/live-stream";

export default function LivePage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-[#8B2323]/20 pt-8">
      <main className="max-w-6xl mx-auto px-4 md:px-8">
        <LiveStreamSection variant="page" />
      </main>
      <MobileBottomNav />
    </div>
  );
}
