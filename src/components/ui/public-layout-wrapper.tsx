"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/ui/navigation";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";

import { GlobalAttendancePrompt } from "@/components/ui/global-attendance-prompt";

export function PublicLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Do not render the public Navigation and Footer on Admin pages
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div 
      className="flex min-h-screen flex-col bg-transparent overflow-x-hidden"
    >
      <div className="hidden md:block">
        <Navigation />
      </div>
      <main key={pathname} className="flex-1 pb-20 md:pb-0 animate-page-enter">{children}</main>
      <GlobalAttendancePrompt />
      <MobileBottomNav />
    </div>
  );
}
