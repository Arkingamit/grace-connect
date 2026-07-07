"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AdminDataProvider } from "@/lib/admin-data-context";
import { AuthProvider } from "@/lib/auth-context";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { VersionGate } from "@/components/ui/version-gate";
import { NotificationProvider } from "@/components/ui/notification-provider";

// QueryClient created OUTSIDE the component to prevent recreation on re-render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // treat data as fresh for 60s (reduced refetches)
      gcTime: 10 * 60_000,         // keep unused data in cache for 10 min
      retry: 1,
      refetchOnWindowFocus: false,  // don't refetch on tab switch (church app users tab-switch often)
      refetchOnReconnect: 'always', // always refetch after offline period
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "replace_with_your_google_client_id.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          {/*
           * AdminDataProvider is kept here because public components
           * (HeroSection, SermonsPreview, GallerySection, etc.) all call useAdminData().
           * The provider itself is smart: it only fetches admin-specific data
           * (users, event registrations) when on /admin routes — see admin-data-context.tsx.
           * LiveStreamPoller is scoped to the admin layout to avoid public polling.
           */}
          <AdminDataProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <NotificationProvider>
                  <VersionGate>
                    {children}
                  </VersionGate>
                </NotificationProvider>
              </TooltipProvider>
            </AuthProvider>
          </AdminDataProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
