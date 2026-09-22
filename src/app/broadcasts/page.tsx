"use client";

import React from "react";
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { NoteShareSection } from "@/components/ui/note-share-section";
import { AuthGate } from "@/components/ui/auth-gate";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";

export default function BroadcastsPage() {
  const { goBack } = useNavigationHistory();

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-primary/20">
      <div className="container mx-auto px-4 sm:px-6 page-back-offset pb-2">
        <div className="page-back-bar mb-2">
          <Button onClick={() => goBack("/")} variant="ghost" className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Notes</span>
          </Button>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6">
        <AuthGate title="Note Share" className="mt-2 md:mt-6" showBack={false}>
          <NoteShareSection variant="page" />
        </AuthGate>
      </div>
    </div>
  );
}
