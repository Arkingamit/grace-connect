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
const NAV_SWIPE_FLICK = 28;
const PAGE_SWIPE_MIN = 64;
const PAGE_EDGE = 40;
const PILL_INSET = 3;
const PILL_MOVE = { type: "tween" as const, duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

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

function isIgnoredSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      `nav[aria-label="Primary"], .swiper, .swiper-slide, [data-no-tab-swipe], .highlights-stack-card, input, textarea, select, [contenteditable="true"], [role="slider"], ${OVERLAY_SCROLL_SELECTOR}`,
    )
  ) {
    return true;
  }

  let node: HTMLElement | null = target as HTMLElement;
  while (node && node !== document.body) {
    const { overflowX, overflowY } = window.getComputedStyle(node);
    if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 8) {
      return true;
    }
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 8) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function tabMetrics(el: HTMLElement) {
  return {
    left: el.offsetLeft + PILL_INSET,
    top: el.offsetTop + PILL_INSET,
    width: Math.max(0, el.offsetWidth - PILL_INSET * 2),
    height: Math.max(0, el.offsetHeight - PILL_INSET * 2),
    center: el.offsetLeft + el.offsetWidth / 2,
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
    const { left, top, width, height } = tabMetrics(el);
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

  const lerpPill = useCallback((fromIndex: number, toIndex: number, t: number) => {
    const fromEl = itemRefs.current[fromIndex];
    const toEl = itemRefs.current[toIndex];
    if (!fromEl || !toEl) return;
    const a = tabMetrics(fromEl);
    const b = tabMetrics(toEl);
    const tt = Math.max(0, Math.min(1, t));
    const jelly = 1.35; // stay large while swiping
    const naturalW = a.width + (b.width - a.width) * tt;
    const width = naturalW * jelly;
    const naturalH = a.height + (b.height - a.height) * tt;
    const height = naturalH * jelly;
    pillX.set(a.left + (b.left - a.left) * tt - (width - naturalW) / 2);
    pillY.set(a.top + (b.top - a.top) * tt - (height - naturalH) / 2);
    pillW.set(width);
    pillH.set(height);
  }, [pillH, pillW, pillX, pillY]);

  const followPointer = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const tabs = itemRefs.current
      .map((el) => (el ? tabMetrics(el) : null))
      .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
    if (tabs.length < 2) return;

    const x = localX(bar, clientX);
    let i = 0;
    for (let n = 0; n < tabs.length - 1; n++) {
      if (x >= tabs[n].center) i = n;
    }
    const a = tabs[i];
    const b = tabs[Math.min(i + 1, tabs.length - 1)];
    const span = b.center - a.center || 1;
    const t = Math.max(0, Math.min(1, (x - a.center) / span));
    const jelly = 1.35; // stay large while dragging
    const naturalW = a.width + (b.width - a.width) * t;
    const width = naturalW * jelly;
    const naturalH = a.height + (b.height - a.height) * t;
    const height = naturalH * jelly;
    pillX.set(a.left + (b.left - a.left) * t - (width - naturalW) / 2);
    pillY.set(a.top + (b.top - a.top) * t - (height - naturalH) / 2);
    pillW.set(width);
    pillH.set(height);
    const hovered = t < 0.5 ? i : Math.min(i + 1, tabs.length - 1);
    highlightRef.current = hovered;
    setHighlightIndex(hovered);
    setSheen(clientX, true);
  }, [pillH, pillW, pillX, pillY, setSheen]);

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
      if (isOnTab(pathname, item)) return;
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
  }, [activeIndex, compact, placePill]);

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

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
    };
  }, [compact, placePill]);

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

  useEffect(() => {
    if (keyboardOpen || !onTabRoute) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let pageDragging = false;

    const snapBack = () => {
      if (!pageDragging) return;
      placePill(activeIndexRef.current, false);
      setHighlightIndex(activeIndexRef.current);
      highlightRef.current = activeIndexRef.current;
      clearSheen();
    };

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
      pageDragging = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!pageDragging && Math.abs(dx) < 12) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
      pageDragging = true;
      const from = activeIndexRef.current;
      const to = Math.max(0, Math.min(NAV_ITEMS.length - 1, from + (dx < 0 ? 1 : -1)));
      const t = to === from ? 0 : Math.min(1, Math.abs(dx) / 140);
      lerpPill(from, to, t);
      const hovered = t < 0.5 ? from : to;
      highlightRef.current = hovered;
      setHighlightIndex(hovered);
      setSheen(touch.clientX, true);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) {
        snapBack();
        pageDragging = false;
        return;
      }
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Math.max(1, Date.now() - startT);
      const isFlick = Math.abs(dx) > 40 && Math.abs(dx) / dt > 0.45;
      const isSwipe = Math.abs(dx) >= PAGE_SWIPE_MIN;
      if ((!isSwipe && !isFlick) || Math.abs(dx) < Math.abs(dy) * 1.35) {
        snapBack();
        pageDragging = false;
        return;
      }
      pageDragging = false;
      goToIndex(activeIndexRef.current + (dx < 0 ? 1 : -1));
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [clearSheen, goToIndex, keyboardOpen, lerpPill, onTabRoute, placePill, setSheen]);

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
          "pointer-events-auto mx-auto origin-bottom transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          compact ? "max-w-[19rem]" : "max-w-[22rem]",
        )}
      >
        <div
          ref={barRef}
          className={cn(
            "relative flex touch-none items-center gap-0.5 rounded-full transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact ? "px-1.5 py-1" : "px-1 py-1",
          )}
          onPointerDown={onNavPointerDown}
        >
          <div 
            className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
            style={{ boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)" }}
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
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15), 0 0 10px rgba(0, 0, 0, 0.05)"
            }}
          >
            <div className="absolute -inset-4 z-0" style={{ backdropFilter: "blur(6px)", filter: "url(#glass-distortion)", isolation: "isolate" }} />
            <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: "rgba(255, 255, 255, 0.15)" }} />
            <div className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden" style={{ boxShadow: "inset 4px 4px 4px 0 rgba(255, 255, 255, 0.95), inset -2px -2px 4px 0 rgba(220, 180, 180, 0.4), inset 0 -4px 10px rgba(255, 255, 255, 0.4)" }} />
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
                  "relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center rounded-full transition-colors duration-200 [-webkit-tap-highlight-color:transparent]",
                  compact ? "h-11 px-1.5" : "h-[3.4rem] px-1.5",
                  isActive ? "text-[#8B2323]" : "text-[#4A3A32] active:text-[#3A2D27]",
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
                    "relative z-10 overflow-hidden text-center text-[10px] font-semibold leading-none tracking-wide transition-all duration-300",
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
