"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { EventsSection } from "@/components/ui/events-section";
import { AuthGate } from "@/components/ui/auth-gate";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";

export default function EventsPage() {
  const { goBack } = useNavigationHistory();

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <div className="container mx-auto px-6 page-back-offset pb-2">
        <div className="page-back-bar mb-2">
          <Button onClick={() => goBack("/")} variant="ghost" className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Events</span>
          </Button>
        </div>
      </div>
      <div className="px-4 md:px-0">
        <AuthGate title="Events" showBack={false}>
          <EventsSection variant="page" />
        </AuthGate>
      </div>
    </div>
  );
}

