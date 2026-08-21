"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Navigation } from "@/components/ui/navigation";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";

import { GlobalAttendancePrompt } from "@/components/ui/global-attendance-prompt";

export function PublicLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);
  
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div 
      className="flex min-h-screen flex-col bg-transparent overflow-x-hidden"
    >
      {!isNative && (
        <div className="hidden desktop:block">
          <Navigation />
        </div>
      )}
      <main key={pathname} className={`flex-1 animate-page-enter ${isNative ? 'pb-20' : 'pb-20 desktop:pb-0'}`}>{children}</main>
      <GlobalAttendancePrompt />
      <MobileBottomNav />
    </div>
  );
}
