"use client";

import React from "react";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { NoteShareSection } from "@/components/ui/note-share-section";
import { AuthGate } from "@/components/ui/auth-gate";

export default function BroadcastsPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-primary/20">
      <div className="pt-8 px-4 md:px-0">
        <AuthGate title="Note Share" className="mt-8 md:mt-24">
          <NoteShareSection variant="page" />
        </AuthGate>
      </div>
    </div>
  );
}
