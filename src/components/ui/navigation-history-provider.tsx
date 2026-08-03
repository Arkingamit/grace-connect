"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationHistoryContextType {
  history: string[];
  goBack: (fallbackRoute?: string) => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory((prev) => {
      // If we are already on this path, don't add it again
      if (prev[prev.length - 1] === pathname) {
        return prev;
      }
      const newHistory = [...prev, pathname];
      // Keep only the last 5 pages
      if (newHistory.length > 5) {
        newHistory.shift();
      }
      return newHistory;
    });
  }, [pathname]);

  const goBack = (fallbackRoute: string = "/") => {
    setHistory((prev) => {
      if (prev.length > 1) {
        const newHistory = [...prev];
        newHistory.pop(); // Remove current page
        const previousPage = newHistory[newHistory.length - 1];
        // Note: Using router.push instead of back() to guarantee navigation matches our tracked stack
        router.push(previousPage);
        return newHistory;
      } else {
        router.push(fallbackRoute);
        return prev;
      }
    });
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
