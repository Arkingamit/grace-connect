"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/lib/admin-data-context";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw, Check, ArrowDown } from "lucide-react";

const TRIGGER_DISTANCE = 72; // Distance in px needed to latch refresh
const MAX_PULL = 115; // Maximum pull distance
const RESTING_DISTANCE = 56; // Distance while refreshing

export function PullToRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { refreshPublicData } = useAdminData();
  const { refreshMembers, refreshSession } = useAuth();

  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const startY = useRef<number>(0);
  const startX = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const hasTriggeredHaptic = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);

  // Keep ref in sync to avoid stale state in event listeners
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // Haptics unavailable, continue silently
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(RESTING_DISTANCE);
    triggerHaptic();

    const minDelay = new Promise((resolve) => setTimeout(resolve, 650));

    try {
      const refreshTasks = [
        queryClient.invalidateQueries(),
        queryClient.refetchQueries(),
        refreshPublicData?.(),
        refreshSession?.(),
        refreshMembers?.(),
      ];

      // Dispatch event for any page-level custom refresh handlers
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app:pull-to-refresh"));
      }

      router.refresh();

      await Promise.allSettled([...refreshTasks, minDelay]);
      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn("[pull-to-refresh] Refresh error:", err);
      await minDelay;
    } finally {
      setIsRefreshing(false);
      setIsSuccess(false);
      setPullDistance(0);
      hasTriggeredHaptic.current = false;
      isPulling.current = false;
    }
  }, [queryClient, refreshPublicData, refreshSession, refreshMembers, router, triggerHaptic]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Helper: Checks if the touch is at the top of scrollable elements
    const isAtTopOfScrollable = (target: EventTarget | null): boolean => {
      // Check window / body scroll first
      const pageScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (pageScroll > 1) return false;

      // Check if target is inside an element that is scrolled down
      let el = target as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        // Skip pull-to-refresh if touching inside a dialog / modal with its own scrolling
        if (el.getAttribute("role") === "dialog" || el.hasAttribute("data-radix-portal")) {
          if (el.scrollTop > 1) return false;
        }
        // Check input fields
        if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
          return false;
        }
        el = el.parentElement;
      }

      return true;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (!isAtTopOfScrollable(e.target)) {
        isPulling.current = false;
        return;
      }

      startY.current = touch.clientY;
      startX.current = touch.clientX;
      isPulling.current = true;
      hasTriggeredHaptic.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dy = touch.clientY - startY.current;
      const dx = touch.clientX - startX.current;

      // If moving horizontally or upwards, cancel pull
      if (Math.abs(dx) > Math.abs(dy) || dy <= 0) {
        if (pullDistance > 0) setPullDistance(0);
        return;
      }

      // Check if user scrolled down during the gesture
      const pageScroll = window.scrollY || document.documentElement.scrollTop || 0;
      if (pageScroll > 1) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      // Non-linear dampening formula (feels like native iOS/Android rubber-banding)
      const damped = Math.min(MAX_PULL, Math.pow(dy, 0.82));

      // Latch haptic feedback when crossing threshold
      if (damped >= TRIGGER_DISTANCE && !hasTriggeredHaptic.current) {
        triggerHaptic();
        hasTriggeredHaptic.current = true;
      } else if (damped < TRIGGER_DISTANCE && hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = false;
      }

      setPullDistance(damped);

      // Prevent native overscroll browser bounce if pulling down at top
      if (damped > 10 && e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current || isRefreshingRef.current) {
        isPulling.current = false;
        return;
      }

      isPulling.current = false;

      if (pullDistance >= TRIGGER_DISTANCE) {
        handleRefresh();
      } else {
        setPullDistance(0);
        hasTriggeredHaptic.current = false;
      }
    };

    const onTouchCancel = () => {
      isPulling.current = false;
      if (!isRefreshingRef.current) {
        setPullDistance(0);
        hasTriggeredHaptic.current = false;
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [handleRefresh, pullDistance, triggerHaptic]);

  // Compute animation and progress
  const progress = Math.min(1, pullDistance / TRIGGER_DISTANCE);
  const isVisible = pullDistance > 0 || isRefreshing;
  const rotation = progress * 240;

  // SVG circular progress parameters
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      aria-hidden="true"
      className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none transition-transform"
      style={{
        top: "max(12px, env(safe-area-inset-top, 12px))",
        transform: `translate3d(-50%, ${pullDistance > 0 ? pullDistance - 52 : -60}px, 0)`,
        transition: isPulling.current ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-200 ${
          isSuccess
            ? "bg-emerald-500 text-white border-emerald-400"
            : "bg-white/95 dark:bg-zinc-900/95 text-primary border-black/10 dark:border-white/10"
        }`}
      >
        {isSuccess ? (
          <Check className="w-5 h-5 animate-scale-in" />
        ) : isRefreshing ? (
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Circular Progress Ring */}
            <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-muted-foreground/20"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-primary transition-all"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Arrow in Center */}
            <ArrowDown
              className="w-3.5 h-3.5 absolute text-primary transition-transform duration-100"
              style={{
                transform: `rotate(${rotation}deg)`,
                opacity: Math.max(0.3, progress),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
