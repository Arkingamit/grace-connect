"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlayCircle, CalendarHeart, FileText } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
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
const NAV_SWIPE_FLICK = 36;
const PAGE_SWIPE_MIN = 64;
const PAGE_EDGE = 28;
const SPRING = { type: "spring" as const, stiffness: 480, damping: 36, mass: 0.55 };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home, exact: true },
  { label: "Sermons", href: "/sermons", icon: PlayCircle },
  { label: "Notes", href: "/broadcasts", icon: FileText },
  { label: "Events", href: "/events", icon: CalendarHeart },
];

function tabIndexForPath(pathname: string) {
  const exact = NAV_ITEMS.findIndex((item) => item.exact && pathname === item.href);
  if (exact >= 0) return exact;
  return NAV_ITEMS.findIndex(
    (item) => !item.exact && item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}

function isIgnoredSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'nav[aria-label="Primary"], .swiper, .swiper-slide, [data-no-tab-swipe], input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="slider"], [data-radix-scroll-area-viewport]',
    )
  ) {
    return true;
  }

  let node: HTMLElement | null = target as HTMLElement;
  while (node && node !== document.body) {
    const { overflowX } = window.getComputedStyle(node);
    if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 8) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const keyboardOpen = useKeyboardOpen();
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const firstLayout = useRef(true);
  const dragStartIndexRef = useRef(0);
  const highlightRef = useRef(0);

  const pillX = useMotionValue(0);
  const pillY = useMotionValue(0);
  const pillW = useMotionValue(0);
  const pillH = useMotionValue(0);

  const pathIndex = useMemo(() => {
    const index = tabIndexForPath(pathname);
    return index < 0 ? 0 : index;
  }, [pathname]);

  const [activeIndex, setActiveIndex] = useState(pathIndex);
  const [highlightIndex, setHighlightIndex] = useState(pathIndex);
  const onTabRoute = tabIndexForPath(pathname) >= 0;

  const placePill = useCallback((index: number, instant: boolean) => {
    const bar = barRef.current;
    const el = itemRefs.current[index];
    if (!bar || !el) return;
    const barRect = bar.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const x = rect.left - barRect.left;
    const y = rect.top - barRect.top;
    if (instant) {
      pillX.set(x);
      pillY.set(y);
      pillW.set(rect.width);
      pillH.set(rect.height);
      return;
    }
    void animate(pillX, x, SPRING);
    void animate(pillY, y, SPRING);
    void animate(pillW, rect.width, SPRING);
    void animate(pillH, rect.height, SPRING);
  }, [pillH, pillW, pillX, pillY]);

  const followPointer = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const barLeft = bar.getBoundingClientRect().left;
    const tabs = itemRefs.current
      .map((el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left - barLeft,
          top: rect.top - bar.getBoundingClientRect().top,
          width: rect.width,
          height: rect.height,
          center: rect.left - barLeft + rect.width / 2,
        };
      })
      .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
    if (tabs.length < 2) return;

    const x = clientX - barLeft;
    let i = 0;
    for (let n = 0; n < tabs.length - 1; n++) {
      if (x >= tabs[n].center) i = n;
    }
    const a = tabs[i];
    const b = tabs[Math.min(i + 1, tabs.length - 1)];
    const span = b.center - a.center || 1;
    const t = Math.max(0, Math.min(1, (x - a.center) / span));
    const left = a.left + (b.left - a.left) * t;
    const width = a.width + (b.width - a.width) * t;
    const stretch = 1 + Math.min(0.16, Math.abs(x - (a.center + span * t)) / 160);
    pillX.set(left - (width * (stretch - 1)) / 2);
    pillW.set(width * stretch);
    pillH.set(a.height);
    pillY.set(a.top + (b.top - a.top) * t);
    const hovered = t < 0.5 ? i : Math.min(i + 1, tabs.length - 1);
    highlightRef.current = hovered;
    setHighlightIndex(hovered);
  }, [pillH, pillW, pillX, pillY]);

  const goToIndex = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(NAV_ITEMS.length - 1, index));
      const item = NAV_ITEMS[next];
      if (!item) return;
      setActiveIndex(next);
      setHighlightIndex(next);
      highlightRef.current = next;
      placePill(next, false);
      const alreadyThere = item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (alreadyThere) return;
      router.replace(item.href);
    },
    [pathname, placePill, router],
  );

  const indexFromX = useCallback((clientX: number) => {
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }, []);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    setActiveIndex(pathIndex);
    setHighlightIndex(pathIndex);
    highlightRef.current = pathIndex;
  }, [pathIndex]);

  useLayoutEffect(() => {
    const instant = firstLayout.current;
    firstLayout.current = false;
    placePill(activeIndex, instant);
  }, [activeIndex, compact, placePill]);

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

  useEffect(() => {
    if (keyboardOpen || !onTabRoute) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      if (touch.clientX < PAGE_EDGE) return;
      if (isIgnoredSwipeTarget(event.target)) return;
      if (window.matchMedia("(min-width: 1400px)").matches) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startT = Date.now();
      tracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Math.max(1, Date.now() - startT);
      const isFlick = Math.abs(dx) > 40 && Math.abs(dx) / dt > 0.45;
      const isSwipe = Math.abs(dx) >= PAGE_SWIPE_MIN;
      if ((!isSwipe && !isFlick) || Math.abs(dx) < Math.abs(dy) * 1.35) return;
      goToIndex(pathIndex + (dx < 0 ? 1 : -1));
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goToIndex, keyboardOpen, onTabRoute, pathIndex]);

  const onNavPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    dragStartIndexRef.current = highlightRef.current;
    draggingRef.current = false;
    suppressClickRef.current = false;
  };

  const onNavPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    if (!draggingRef.current && Math.abs(dx) < 8) return;
    if (!draggingRef.current) {
      draggingRef.current = true;
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    followPointer(event.clientX);
  };

  const finishNavGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    const dragged = draggingRef.current;
    pointerIdRef.current = null;
    draggingRef.current = false;

    if (!dragged) return;

    const start = dragStartIndexRef.current;
    let next = highlightRef.current;
    if (next === start) {
      next = indexFromX(event.clientX);
    }
    // Dragging the pill toward the next tab is a rightward move (dx > 0).
    if (next === start && Math.abs(dx) >= NAV_SWIPE_FLICK) {
      next = start + (dx > 0 ? 1 : -1);
    }
    goToIndex(next);
  };

  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 desktop:hidden pointer-events-none px-5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto origin-bottom transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          compact ? "max-w-[19rem]" : "max-w-[22rem]",
        )}
      >
        <div
          ref={barRef}
          className={cn(
            "liquid-glass-nav relative flex touch-pan-x items-center gap-0.5 rounded-full transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact ? "px-1.5 py-1" : "px-1 py-1",
          )}
          onPointerDown={onNavPointerDown}
          onPointerMove={onNavPointerMove}
          onPointerUp={finishNavGesture}
          onPointerCancel={finishNavGesture}
        >
          <motion.span
            aria-hidden
            className="liquid-glass-pill pointer-events-none absolute left-0 top-0 rounded-full"
            style={{ x: pillX, y: pillY, width: pillW, height: pillH }}
          />
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = highlightIndex === index;

            return (
              <button
                key={item.href}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  goToIndex(index);
                }}
                className={cn(
                  "relative z-10 flex flex-1 flex-col items-center justify-center rounded-full transition-colors duration-200",
                  compact ? "h-11 px-2" : "h-[3.4rem] px-2",
                  isActive ? "text-[#8B2323]" : "text-[#7A6150] active:text-[#3A2D27]",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={cn(
                    "relative z-10 shrink-0 transition-all duration-300",
                    compact ? "h-[22px] w-[22px]" : "h-5 w-5",
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 overflow-hidden text-[10px] font-semibold leading-none tracking-wide transition-all duration-300",
                    compact ? "mt-0 max-h-0 opacity-0" : "mt-0.5 max-h-4 opacity-100",
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
