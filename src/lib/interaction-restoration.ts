"use client";

export interface InteractedComponentData {
  routeKey: string;
  pathname: string;
  id?: string;
  dataIdSelector?: string;
  hrefSelector?: string;
  cssSelector?: string;
  textSnippet?: string;
  tagName?: string;
  viewportOffsetTop?: number;
  docOffsetY?: number;
  windowScrollY: number;
  windowScrollX: number;
  timestamp: number;
}

const STORAGE_KEY = "grace_interaction_restoration_v1";
const MAX_SAVED_ROUTES = 30;

// In-memory cache for fast synchronous access
const memoryStore = new Map<string, InteractedComponentData>();

function getStorageMap(): Record<string, InteractedComponentData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistStorageMap(map: Record<string, InteractedComponentData>) {
  if (typeof window === "undefined") return;
  try {
    // Limit stored keys to MAX_SAVED_ROUTES
    const entries = Object.entries(map);
    if (entries.length > MAX_SAVED_ROUTES) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const pruned = Object.fromEntries(entries.slice(0, MAX_SAVED_ROUTES));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildRouteKey(pathname: string, search = ""): string {
  const p = pathname || "/";
  const cleanSearch = search.startsWith("?") ? search.slice(1) : search;
  return cleanSearch ? `${p}?${cleanSearch}` : p;
}

/**
 * Finds the nearest meaningful component container (Card, Article, Button, Link, Section, etc.)
 */
function findComponentContainer(el: HTMLElement | null): HTMLElement | null {
  if (!el || el === document.body || el === document.documentElement) return null;

  // Explicit component markers
  const semantic = el.closest<HTMLElement>(
    [
      "[data-component-id]",
      "[data-id]",
      "[data-item-id]",
      "[data-sermon-id]",
      "[data-event-id]",
      "[data-prayer-id]",
      "[data-song-id]",
      "[data-note-id]",
      "[data-card-id]",
      "[data-slot='card']",
      "article",
      "[role='article']",
      ".card",
      "[role='button']",
      "[role='tab']",
      "[role='listitem']",
      "button",
      "a",
      "li",
      "section",
    ].join(", ")
  );

  if (semantic && semantic !== document.body && semantic !== document.documentElement) {
    return semantic;
  }

  // Look for any card-like div (rounded + border or shadow)
  let curr: HTMLElement | null = el;
  while (curr && curr !== document.body) {
    const cl = curr.className;
    if (typeof cl === "string" && (cl.includes("rounded-") || cl.includes("card") || cl.includes("border"))) {
      const rect = curr.getBoundingClientRect();
      if (rect.height > 40 && rect.width > 60) {
        return curr;
      }
    }
    curr = curr.parentElement;
  }

  return el;
}

/**
 * Constructs a unique, resilient CSS selector path from main or body down to the element
 */
function computeCssSelector(el: HTMLElement): string {
  try {
    const parts: string[] = [];
    let curr: HTMLElement | null = el;

    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (curr.id && !curr.id.includes(":") && !curr.id.startsWith("radix-")) {
        parts.unshift(`#${CSS.escape(curr.id)}`);
        break; // Unique ID is sufficient
      }

      let tag = curr.tagName.toLowerCase();
      const parent = curr.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName.toLowerCase() === tag);
        if (siblings.length > 1) {
          const index = siblings.indexOf(curr) + 1;
          tag += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(tag);
      if (tag === "main") break;
      curr = parent;
    }

    return parts.join(" > ");
  } catch {
    return "";
  }
}

/**
 * Extracts the primary text snippet (title, heading, or first prominent words)
 */
function extractTextSnippet(el: HTMLElement): string {
  try {
    const heading = el.querySelector<HTMLElement>(
      "h1, h2, h3, h4, h5, h6, [class*='title'], [class*='font-semibold'], [class*='font-bold'], [class*='font-medium']"
    );
    const raw = (heading?.textContent || el.textContent || "").trim();
    return raw.replace(/\s+/g, " ").slice(0, 45).trim();
  } catch {
    return "";
  }
}

/**
 * Records an interaction with any component on the current page
 */
export function saveComponentInteraction(
  target: HTMLElement | null,
  pathname: string,
  search = ""
) {
  if (typeof window === "undefined" || !target) return;

  // Ignore navigation bars, overlays, dialogs, or elements explicitly marked with data-no-restore
  if (
    target.closest(
      'nav[aria-label="Primary"], .mobile-bottom-nav, [data-no-restore], [data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"]'
    )
  ) {
    return;
  }

  const component = findComponentContainer(target);
  if (!component) return;

  const rect = component.getBoundingClientRect();
  const routeKey = buildRouteKey(pathname, search);

  // Extract identifiable selectors
  let id: string | undefined;
  if (component.id && !component.id.includes(":") && !component.id.startsWith("radix-")) {
    id = component.id;
  }

  let dataIdSelector: string | undefined;
  for (const attr of [
    "data-component-id",
    "data-id",
    "data-sermon-id",
    "data-event-id",
    "data-prayer-id",
    "data-song-id",
    "data-note-id",
    "data-item-id",
    "data-card-id",
  ]) {
    const val = component.getAttribute(attr);
    if (val) {
      dataIdSelector = `[${attr}="${CSS.escape(val)}"]`;
      break;
    }
  }

  let hrefSelector: string | undefined;
  const linkEl = component.tagName.toLowerCase() === "a" ? component : component.querySelector("a");
  const href = linkEl?.getAttribute("href");
  if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
    hrefSelector = `a[href="${CSS.escape(href)}"]`;
  }

  const cssSelector = computeCssSelector(component);
  const textSnippet = extractTextSnippet(component);

  const data: InteractedComponentData = {
    routeKey,
    pathname,
    id,
    dataIdSelector,
    hrefSelector,
    cssSelector,
    textSnippet,
    tagName: component.tagName.toLowerCase(),
    viewportOffsetTop: Math.round(rect.top),
    docOffsetY: Math.round(rect.top + window.scrollY),
    windowScrollY: Math.round(window.scrollY),
    windowScrollX: Math.round(window.scrollX),
    timestamp: Date.now(),
  };

  memoryStore.set(routeKey, data);
  memoryStore.set(pathname, data);

  const map = getStorageMap();
  map[routeKey] = data;
  map[pathname] = data;
  persistStorageMap(map);
}

/**
 * Saves the current scroll position and component currently in the viewport
 */
export function saveScrollState(pathname: string, search = "") {
  if (typeof window === "undefined") return;

  const routeKey = buildRouteKey(pathname, search);
  const scrollY = Math.round(window.scrollY);
  const scrollX = Math.round(window.scrollX);

  if (scrollY < 20) {
    // User is near the top
    const data: InteractedComponentData = {
      routeKey,
      pathname,
      windowScrollY: 0,
      windowScrollX: 0,
      timestamp: Date.now(),
    };
    memoryStore.set(routeKey, data);
    memoryStore.set(pathname, data);
    const map = getStorageMap();
    map[routeKey] = data;
    map[pathname] = data;
    persistStorageMap(map);
    return;
  }

  // Find the primary element in view (upper third of viewport)
  const centerX = Math.max(10, Math.floor(window.innerWidth / 2));
  const centerY = Math.max(10, Math.floor(window.innerHeight * 0.35));
  const elAtPoint = document.elementFromPoint(centerX, centerY) as HTMLElement | null;

  if (elAtPoint) {
    saveComponentInteraction(elAtPoint, pathname, search);
  } else {
    // Save scroll only
    const data: InteractedComponentData = {
      routeKey,
      pathname,
      windowScrollY: scrollY,
      windowScrollX: scrollX,
      timestamp: Date.now(),
    };
    memoryStore.set(routeKey, data);
    memoryStore.set(pathname, data);
    const map = getStorageMap();
    map[routeKey] = data;
    map[pathname] = data;
    persistStorageMap(map);
  }
}

/**
 * Resolves the target component in the current DOM
 */
export function findSavedComponent(saved: InteractedComponentData): HTMLElement | null {
  if (typeof document === "undefined") return null;

  // 1. By direct ID
  if (saved.id) {
    const el = document.getElementById(saved.id);
    if (el) return el;
  }

  // 2. By data attribute selector
  if (saved.dataIdSelector) {
    try {
      const el = document.querySelector<HTMLElement>(saved.dataIdSelector);
      if (el) return el;
    } catch {}
  }

  // 3. By href selector
  if (saved.hrefSelector) {
    try {
      const el = document.querySelector<HTMLElement>(saved.hrefSelector);
      if (el) {
        return findComponentContainer(el) || el;
      }
    } catch {}
  }

  // 4. By CSS selector
  if (saved.cssSelector) {
    try {
      const el = document.querySelector<HTMLElement>(saved.cssSelector);
      if (el) return el;
    } catch {}
  }

  // 5. By Text snippet (very resilient across re-renders and re-ordering)
  if (saved.textSnippet && saved.textSnippet.length >= 4) {
    const candidates = document.querySelectorAll<HTMLElement>(
      "article, [role='article'], .card, [data-slot='card'], button, a, li, section, div"
    );
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (cand.textContent && cand.textContent.includes(saved.textSnippet)) {
        return findComponentContainer(cand) || cand;
      }
    }
  }

  return null;
}

/**
 * Retrieves the saved interaction data for a route
 */
export function getSavedInteraction(
  pathname: string,
  search = ""
): InteractedComponentData | null {
  const routeKey = buildRouteKey(pathname, search);
  if (memoryStore.has(routeKey)) {
    return memoryStore.get(routeKey)!;
  }
  if (memoryStore.has(pathname)) {
    return memoryStore.get(pathname)!;
  }

  const map = getStorageMap();
  return map[routeKey] || map[pathname] || null;
}

/**
 * Spawns/scrolls the viewport to the target component or saved scroll position
 */
export function spawnToComponent(
  target: HTMLElement | null,
  saved: InteractedComponentData
): boolean {
  if (typeof window === "undefined") return false;

  if (target) {
    const rect = target.getBoundingClientRect();
    const currentScrollY = window.scrollY;

    let targetY: number;
    if (
      typeof saved.viewportOffsetTop === "number" &&
      saved.viewportOffsetTop >= 0 &&
      saved.viewportOffsetTop < window.innerHeight
    ) {
      // Restore exact vertical placement relative to viewport
      targetY = currentScrollY + rect.top - saved.viewportOffsetTop;
    } else {
      // Center comfortably
      targetY = currentScrollY + rect.top - (window.innerHeight / 2 - rect.height / 2);
    }

    targetY = Math.max(0, targetY);

    window.scrollTo({
      top: targetY,
      left: saved.windowScrollX || 0,
      behavior: "instant" as ScrollBehavior,
    });

    // Provide subtle non-intrusive glow feedback
    target.classList.remove("spanned-restored-component");
    void target.offsetWidth; // trigger reflow
    target.classList.add("spanned-restored-component");
    setTimeout(() => {
      target.classList.remove("spanned-restored-component");
    }, 1300);

    return true;
  }

  // Fallback: Restore window scroll position if document height permits
  if (saved.windowScrollY > 0) {
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight >= saved.windowScrollY + 40) {
      window.scrollTo({
        top: saved.windowScrollY,
        left: saved.windowScrollX || 0,
        behavior: "instant" as ScrollBehavior,
      });
      return true;
    }
  }

  return false;
}
