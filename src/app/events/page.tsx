"use client";

import React from "react";
import { EventsSection } from "@/components/ui/events-section";
import { AuthGate } from "@/components/ui/auth-gate";

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <div className="pt-24 px-4 md:px-0">
        <AuthGate title="Events" className="mt-8">
          <EventsSection variant="page" />
        </AuthGate>
      </div>
    </div>
  );
}
