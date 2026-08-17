"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HOME_ROUTE,
  popNavStack,
  readNavStack,
  routeFromLocation,
  trackRoute,
} from "@/lib/in-app-nav-stack";

interface NavigationHistoryContextType {
  history: string[];
  goBack: (fallbackRoute?: string) => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);

  const route = routeFromLocation(pathname, searchParams.toString());

  useEffect(() => {
    setHistory(trackRoute(route));
  }, [route]);

  const goBack = (fallbackRoute: string = HOME_ROUTE) => {
    const previous = popNavStack();
    if (previous) {
      setHistory(readNavStack());
      router.push(previous);
      return;
    }
    router.push(fallbackRoute);
  };

  return (
    <NavigationHistoryContext.Provider value={{ history, goBack }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext);
  if (context === undefined) {
    throw new Error("useNavigationHistory must be used within a NavigationHistoryProvider");
  }
  return context;
}
