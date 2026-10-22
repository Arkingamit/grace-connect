"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlayCircle, CalendarHeart, FileText, Search } from "lucide-react";
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
const NAV_SWIPE_FLICK = 28;
const PILL_INSET = 3;
const PILL_MOVE = { type: "tween" as const, duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home, exact: true },
  { label: "Sermons", href: "/sermons", icon: PlayCircle },
  { label: "Search", href: "/search", icon: Search },
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

function isOnTab(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const OVERLAY_SCROLL_SELECTOR = [
  '[data-no-tab-swipe]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-select-content]',
  '[data-radix-select-viewport]',
  '[data-radix-dropdown-menu-content]',
  '[data-radix-dropdown-menu-sub-content]',
  '[data-radix-popover-content]',
  '[data-radix-scroll-area-viewport]',
  '[cmdk-list]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="combobox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(', ');

function isOverlayScrollTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(OVERLAY_SCROLL_SELECTOR));
}

function tabMetrics(el: HTMLElement, bar?: HTMLElement | null) {
  const naturalH = el.offsetHeight || 48;
  const height = Math.max(28, naturalH - PILL_INSET * 2);
  const width = height; // Square indicator
  const naturalW = el.offsetWidth || height;
  let left = el.offsetLeft + (naturalW - width) / 2;
  const top = el.offsetTop + PILL_INSET;

  if (bar && bar.offsetWidth > 0) {
    const maxLeft = Math.max(PILL_INSET, bar.offsetWidth - width - PILL_INSET);
    left = Math.max(PILL_INSET, Math.min(maxLeft, left));
  }

  return {
    left,
    top,
    width,
    height,
    center: el.offsetLeft + naturalW / 2,
  };
}

function localX(bar: HTMLElement, clientX: number) {
  const rect = bar.getBoundingClientRect();
  const scale = rect.width / (bar.offsetWidth || 1) || 1;
  return (clientX - rect.left) / scale;
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
  const activeIndexRef = useRef(0);

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
  activeIndexRef.current = activeIndex;
  highlightRef.current = highlightIndex;

  const placePill = useCallback((index: number, instant: boolean) => {
    const bar = barRef.current;
    const el = itemRefs.current[index];
    if (!bar || !el) return;
    const { left, top, width, height } = tabMetrics(el, bar);
    if (instant) {
      pillX.set(left);
      pillY.set(top);
      pillW.set(width);
      pillH.set(height);
      return;
    }
    void animate(pillX, left, PILL_MOVE);
    void animate(pillY, top, PILL_MOVE);
    void animate(pillW, width, PILL_MOVE);
    void animate(pillH, height, PILL_MOVE);
  }, [pillH, pillW, pillX, pillY]);

  const setSheen = useCallback((clientX: number, swiping: boolean) => {
    const bar = barRef.current;
    if (!bar) return;
    const x = localX(bar, clientX);
    const pct = Math.max(6, Math.min(94, (x / (bar.offsetWidth || 1)) * 100));
    bar.style.setProperty("--sheen-x", `${pct}%`);
    bar.style.setProperty("--pill-sheen", `${100 - pct}%`);
    bar.classList.toggle("is-swiping", swiping);
  }, []);

  const clearSheen = useCallback(() => {
    barRef.current?.classList.remove("is-swiping");
  }, []);

  const followPointer = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const tabs = itemRefs.current
      .map((el) => (el ? tabMetrics(el, bar) : null))
      .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
    if (tabs.length === 0) return;

    const x = localX(bar, clientX);
    let hovered = 0;
    let minDist = Infinity;
    for (let n = 0; n < tabs.length; n++) {
      const dist = Math.abs(x - tabs[n].center);
      if (dist < minDist) {
        minDist = dist;
        hovered = n;
      }
    }
    highlightRef.current = hovered;
    setHighlightIndex(hovered);
    placePill(hovered, false);
    setSheen(clientX, true);
  }, [placePill, setSheen]);

function scrollToTop() {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    const scrollables = document.querySelectorAll(
      "main, [data-scroll-container], [data-radix-scroll-area-viewport]"
    );
    scrollables.forEach((el) => {
      if (el instanceof HTMLElement && el.scrollTop > 0) {
        el.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    });
  } catch {
    window.scrollTo(0, 0);
  }
}

  const goToIndex = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(NAV_ITEMS.length - 1, index));
      const item = NAV_ITEMS[next];
      if (!item) return;
      activeIndexRef.current = next;
      highlightRef.current = next;
      setActiveIndex(next);
      setHighlightIndex(next);
      placePill(next, false);
      clearSheen();

      // If already on that tab/page, navigate/scroll to top
      if (isOnTab(pathname, item)) {
        if (pathname !== item.href) {
          router.replace(item.href, { scroll: false });
        }
        scrollToTop();
        setCompact(false);
        lastY.current = 0;
        return;
      }

      router.replace(item.href, { scroll: false });
    },
    [clearSheen, pathname, placePill, router],
  );

  useEffect(() => {
    NAV_ITEMS.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    setActiveIndex(pathIndex);
    setHighlightIndex(pathIndex);
    highlightRef.current = pathIndex;
    activeIndexRef.current = pathIndex;
  }, [pathIndex]);

  useLayoutEffect(() => {
    const instant = firstLayout.current;
    firstLayout.current = false;
    placePill(activeIndex, instant);
  }, [activeIndex, placePill]);

  // Continuously track layout during compact mode CSS transitions (max-width & padding)
  useEffect(() => {
    let animId: number;
    const start = performance.now();
    const duration = 350;

    const tick = (now: number) => {
      placePill(activeIndexRef.current, true);
      if (now - start < duration) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [compact, placePill]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const sync = () => placePill(activeIndexRef.current, true);
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    itemRefs.current.forEach((el) => {
      if (el) ro.observe(el);
    });
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    bar.addEventListener("transitionend", sync);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      bar.removeEventListener("transitionend", sync);
    };
  }, [placePill]);

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
      if (isOverlayScrollTarget(event.target)) return;
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

  const followPointerRef = useRef(followPointer);
  const goToIndexRef = useRef(goToIndex);
  const clearSheenRef = useRef(clearSheen);
  followPointerRef.current = followPointer;
  goToIndexRef.current = goToIndex;
  clearSheenRef.current = clearSheen;

  const onWindowPointerMove = useRef((event: PointerEvent) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    if (!draggingRef.current && Math.abs(dx) < 8) return;
    draggingRef.current = true;
    suppressClickRef.current = true;
    followPointerRef.current(event.clientX);
  }).current;

  const onWindowPointerUp = useRef((event: PointerEvent) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    const dragged = draggingRef.current;
    pointerIdRef.current = null;
    draggingRef.current = false;
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    if (!dragged) {
      clearSheenRef.current();
      return;
    }

    const start = dragStartIndexRef.current;
    let next = highlightRef.current;
    if (next === start && Math.abs(dx) >= NAV_SWIPE_FLICK) {
      next = start + (dx < 0 ? 1 : -1);
    }
    goToIndexRef.current(next);
  }).current;

  const onNavPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    dragStartIndexRef.current = activeIndexRef.current;
    draggingRef.current = false;
    suppressClickRef.current = false;
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  };

  useEffect(() => () => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
  }, [onWindowPointerMove, onWindowPointerUp]);

  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 desktop:hidden pointer-events-none px-5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
      data-no-restore="true"
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto origin-bottom transition-[max-width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          compact ? "max-w-[20rem]" : "max-w-[22.5rem]",
        )}
      >
        <div
          ref={barRef}
          className={cn(
            "relative flex touch-none items-center gap-0.5 rounded-full overflow-hidden transition-[padding] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            compact ? "px-1 py-1" : "px-1.5 py-1",
          )}
          style={{ boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)" }}
          onPointerDown={onNavPointerDown}
        >
          <div 
            className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
          >
            <div className="absolute -inset-12 z-0" style={{ backdropFilter: "blur(3px)", filter: "url(#glass-distortion)", isolation: "isolate" }} />
            <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: "rgba(255, 255, 255, 0.25)" }} />
            <div className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden" style={{ boxShadow: "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)" }} />
          </div>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-[1] rounded-full overflow-hidden will-change-[left,width]"
            style={{ 
              left: pillX, top: pillY, width: pillW, height: pillH,
              boxShadow: "0 6px 16px rgba(139, 35, 35, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: "linear-gradient(135deg, rgba(251, 232, 232, 0.88) 0%, rgba(247, 216, 216, 0.78) 100%)" }} />
            <div className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden border border-[#8B2323]/20" style={{ boxShadow: "inset 2px 2px 3px 0 rgba(255, 255, 255, 0.95), inset -2px -2px 4px 0 rgba(139, 35, 35, 0.25), inset 0 0 8px rgba(139, 35, 35, 0.08)" }} />
          </motion.span>
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
                  "relative z-10 flex min-w-0 flex-1 items-center justify-center rounded-full transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]",
                  compact ? "h-11 px-1" : "h-12 px-1",
                  isActive ? "text-[#8B2323]" : "text-[#4A3A32] active:text-[#3A2D27]",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon
                  strokeWidth={isActive ? 2.3 : 1.85}
                  className="relative z-10 shrink-0 h-[22px] w-[22px] transition-all duration-200 active:scale-95"
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
