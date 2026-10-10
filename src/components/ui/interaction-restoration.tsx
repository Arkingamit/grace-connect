"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  findSavedComponent,
  getSavedInteraction,
  saveComponentInteraction,
  saveScrollState,
  spawnToComponent,
} from "@/lib/interaction-restoration";

export function InteractionRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPathRef = useRef(pathname);
  const currentSearchRef = useRef(searchParams?.toString() || "");
  const isRestoringRef = useRef(false);
  const userInterruptedRef = useRef(false);

  useEffect(() => {
    currentPathRef.current = pathname;
    currentSearchRef.current = searchParams?.toString() || "";
  }, [pathname, searchParams]);

  // 1. Listen for user interactions (clicks, touches, focus)
  useEffect(() => {
    const handleInteraction = (event: Event) => {
      // If user is actively touching/clicking, user interrupted any pending restoration
      if (isRestoringRef.current) {
        userInterruptedRef.current = true;
      }

      const target = event.target as HTMLElement | null;
      if (!target) return;

      saveComponentInteraction(
        target,
        currentPathRef.current,
        currentSearchRef.current
      );
    };

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener("click", handleInteraction, opts);
    document.addEventListener("pointerdown", handleInteraction, opts);
    document.addEventListener("focusin", handleInteraction, opts);

    return () => {
      document.removeEventListener("click", handleInteraction, true);
      document.removeEventListener("pointerdown", handleInteraction, true);
      document.removeEventListener("focusin", handleInteraction, true);
    };
  }, []);

  // 2. Track scrolling (debounced)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollState(currentPathRef.current, currentSearchRef.current);
      }, 160);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 3. Restore to the exact component when returning to a page
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = getSavedInteraction(pathname, searchParams?.toString() || "");
    if (!saved) return;

    // If there's nothing saved or user was right at the top without component
    if (saved.windowScrollY < 20 && !saved.id && !saved.textSnippet && !saved.dataIdSelector && !saved.hrefSelector) {
      return;
    }

    // Prevent default browser jump to top
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    isRestoringRef.current = true;
    userInterruptedRef.current = false;

    let observer: MutationObserver | null = null;
    let cancelled = false;
    let restoredElement: HTMLElement | null = null;
    let checkIndex = 0;
    const checkDelays = [0, 20, 60, 120, 220, 360, 460, 650, 950, 1400, 2000, 2800];

    const stopRestoration = () => {
      cancelled = true;
      isRestoringRef.current = false;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const attemptSpawn = () => {
      if (cancelled || userInterruptedRef.current) return;

      const target = findSavedComponent(saved);
      if (target) {
        restoredElement = target;
        spawnToComponent(target, saved);

        // Keep verifying briefly after animate-page-enter completes (~400ms)
        setTimeout(() => {
          if (!cancelled && !userInterruptedRef.current && target.isConnected) {
            spawnToComponent(target, saved);
          }
        }, 420);

        // Success - clean up observer after settling
        setTimeout(stopRestoration, 600);
        return;
      }

      // If specific element not ready yet, restore document scroll if height permits
      if (saved.windowScrollY > 20) {
        spawnToComponent(null, saved);
      }
    };

    // Attempt immediately
    attemptSpawn();

    // Observe DOM mutations for asynchronously loaded components
    try {
      observer = new MutationObserver(() => {
        if (!restoredElement && !cancelled && !userInterruptedRef.current) {
          attemptSpawn();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch {
      // Ignore
    }

    // Polling schedule
    const timeouts: NodeJS.Timeout[] = [];
    checkDelays.forEach((delay) => {
      const t = setTimeout(() => {
        if (!restoredElement && !cancelled && !userInterruptedRef.current) {
          attemptSpawn();
        }
      }, delay);
      timeouts.push(t);
    });

    // Cleanup after 3.2s regardless
    const maxTimeout = setTimeout(stopRestoration, 3200);

    return () => {
      stopRestoration();
      clearTimeout(maxTimeout);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [pathname, searchParams]);

  return null;
}
