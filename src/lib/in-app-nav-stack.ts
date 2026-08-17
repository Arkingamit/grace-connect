/** Last-N in-app routes (pathname + query). Shared by UI back and Android system back. */

export const IN_APP_NAV_STACK_KEY = "grace_in_app_nav_stack";
export const IN_APP_NAV_STACK_MAX = 5;
/** App home. Spec’s `/songs` maps to `/` in Grace Connect. */
export const HOME_ROUTE = "/";

export function routeFromLocation(pathname: string, search: string): string {
  const path = pathname || HOME_ROUTE;
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${path}?${query}` : path;
}

export function readNavStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(IN_APP_NAV_STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .slice(-IN_APP_NAV_STACK_MAX);
  } catch {
    return [];
  }
}

export function writeNavStack(stack: string[]): string[] {
  const next = stack.slice(-IN_APP_NAV_STACK_MAX);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(IN_APP_NAV_STACK_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota / private-mode failures
    }
  }
  return next;
}

/** Append current route unless it is already last (including after a back navigation). */
export function trackRoute(route: string): string[] {
  const stack = readNavStack();
  if (stack[stack.length - 1] === route) return stack;
  return writeNavStack([...stack, route]);
}

/**
 * Drop the current route and return the previous one.
 * Returns null when there is nowhere in the in-app stack to go.
 */
export function popNavStack(): string | null {
  const stack = readNavStack();
  if (stack.length < 2) return null;
  stack.pop();
  const previous = stack[stack.length - 1];
  writeNavStack(stack);
  return previous || null;
}

export function isExitConfirmRoute(pathname: string): boolean {
  if (pathname === HOME_ROUTE || pathname === "/login") return true;
  if (pathname === "/register" || pathname.startsWith("/register/")) return true;
  return false;
}
