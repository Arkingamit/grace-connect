"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlayCircle, CalendarHeart, FileText } from "lucide-react";
import { useKeyboardOpen } from "@/hooks/useKeyboardInset";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  exact?: boolean;
};

const COMPACT_DELTA = 8;
const EXPAND_DELTA = -6;

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const keyboardOpen = useKeyboardOpen();
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const readY = (target: EventTarget | null) => {
      if (
        target instanceof HTMLElement &&
        target !== document.documentElement &&
        target !== document.body
      ) {
        return target.scrollTop;
      }
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    lastY.current = readY(document);
    let ticking = false;

    const onScroll = (event: Event) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = readY(event.target);
        const delta = y - lastY.current;
        if (y < 20) {
          setCompact(false);
        } else if (delta > COMPACT_DELTA) {
          setCompact(true);
        } else if (delta < EXPAND_DELTA) {
          setCompact(false);
        }
        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  useEffect(() => {
    setCompact(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    { label: "Home", href: "/", icon: Home, exact: true },
    { label: "Sermons", href: "/sermons", icon: PlayCircle },
    { label: "Notes", href: "/broadcasts", icon: FileText },
    { label: "Events", href: "/events", icon: CalendarHeart },
  ];

  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 desktop:hidden pointer-events-none px-5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-[22rem] origin-bottom transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          compact ? "scale-[0.88] translate-y-1" : "scale-100 translate-y-0",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-0.5 rounded-full border border-white/70 bg-[#FAF7F2]/85 shadow-[0_10px_32px_-8px_rgba(58,45,39,0.35),0_0_0_1px_rgba(165,157,148,0.25)] backdrop-blur-xl transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact ? "px-1.5 py-1" : "px-1 py-1",
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  if (pathname !== item.href) router.replace(item.href);
                }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-full transition-all duration-300",
                  compact ? "h-11 min-w-11 px-3" : "h-[3.4rem] min-w-[4.25rem] px-3.5",
                  isActive
                    ? "bg-[#FBE8E8] text-[#8B2323]"
                    : "text-[#7A6150] active:bg-[#E5D5C5]/70",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    compact ? "h-[22px] w-[22px]" : "h-5 w-5",
                    isActive ? "text-[#8B2323]" : "text-[#7A6150]",
                  )}
                />
                <span
                  className={cn(
                    "overflow-hidden text-[10px] font-semibold leading-none tracking-wide transition-all duration-300",
                    compact ? "mt-0 max-h-0 opacity-0" : "mt-0.5 max-h-4 opacity-100",
                    isActive ? "text-[#8B2323]" : "text-[#7A6150]",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
