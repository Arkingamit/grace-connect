"use client";

import React from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { NoteShareSection } from "@/components/ui/note-share-section";
import { AuthGate } from "@/components/ui/auth-gate";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";

export default function BroadcastsPage() {
  const { goBack } = useNavigationHistory();

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-primary/20">
      <div className="container mx-auto px-6 pt-12 pb-2">
        <Button onClick={() => goBack("/")} variant="ghost" className="pl-0 gap-2 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-lg">Back</span>
        </Button>
      </div>
      <div className="px-4 md:px-0">
        <AuthGate title="Note Share" className="mt-4 md:mt-8" showBack={false}>
          <NoteShareSection variant="page" />
        </AuthGate>
      </div>
    </div>
  );
}
