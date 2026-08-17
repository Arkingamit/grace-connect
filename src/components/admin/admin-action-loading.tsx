'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

type AdminActionLoadingContextValue = {
  isBusy: boolean;
  /** Run an async action under a skeleton until it settles */
  withActionLoading: <T>(action: () => Promise<T>) => Promise<T>;
  startAction: () => void;
  endAction: () => void;
};

const AdminActionLoadingContext = createContext<AdminActionLoadingContextValue | null>(null);

export function AdminPageSkeleton({ variant = 'list' }: { variant?: 'list' | 'cards' | 'dashboard' }) {
  if (variant === 'dashboard') {
    return (
      <div className="space-y-5 w-full min-w-0 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl bg-[#E5D5C5]/50" />
          <Skeleton className="h-24 rounded-2xl bg-[#E5D5C5]/50" />
        </div>
        <Skeleton className="h-36 rounded-2xl bg-[#E5D5C5]/50" />
        <Skeleton className="h-36 rounded-2xl bg-[#E5D5C5]/50" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-2xl bg-[#E5D5C5]/50" />
          <Skeleton className="h-14 rounded-2xl bg-[#E5D5C5]/50" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 bg-[#E5D5C5]/50" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl bg-[#E5D5C5]/50" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="space-y-5 w-full min-w-0 animate-in fade-in duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 bg-[#E5D5C5]/50" />
            <Skeleton className="h-4 w-56 bg-[#E5D5C5]/50" />
          </div>
          <Skeleton className="h-11 w-full sm:w-36 rounded-xl bg-[#E5D5C5]/50" />
        </div>
        <Skeleton className="h-11 w-full sm:max-w-md rounded-xl bg-[#E5D5C5]/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-16 rounded-full bg-[#E5D5C5]/50" />
                <Skeleton className="h-8 w-20 bg-[#E5D5C5]/50" />
              </div>
              <Skeleton className="h-5 w-3/4 bg-[#E5D5C5]/50" />
              <Skeleton className="h-4 w-full bg-[#E5D5C5]/50" />
              <Skeleton className="h-4 w-2/3 bg-[#E5D5C5]/50" />
              <Skeleton className="h-8 w-full rounded-lg bg-[#E5D5C5]/50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 bg-[#E5D5C5]/50" />
          <Skeleton className="h-4 w-52 bg-[#E5D5C5]/50" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-xl bg-[#E5D5C5]/50" />
          <Skeleton className="h-11 w-32 rounded-xl bg-[#E5D5C5]/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[72px] rounded-xl bg-[#E5D5C5]/50" />
        <Skeleton className="h-[72px] rounded-xl bg-[#E5D5C5]/50" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl bg-[#E5D5C5]/50" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-[#E5D5C5]/50" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-40 bg-[#E5D5C5]/50" />
              <Skeleton className="h-3 w-56 bg-[#E5D5C5]/50" />
              <Skeleton className="h-3 w-32 bg-[#E5D5C5]/50" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0 bg-[#E5D5C5]/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

function skeletonVariantForPath(pathname: string | null): 'list' | 'cards' | 'dashboard' {
  if (!pathname || pathname === '/admin') return 'dashboard';
  if (pathname.includes('/users') || pathname.includes('/requests') || pathname.includes('/attendance')) {
    return 'list';
  }
  return 'cards';
}

export function AdminActionLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [actionCount, setActionCount] = useState(0);
  const [navPending, setNavPending] = useState(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      setNavPending(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (!url.pathname.startsWith('/admin')) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        setNavPending(true);
      } catch {
        // ignore
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (!navPending) return;
    const t = window.setTimeout(() => setNavPending(false), 10000);
    return () => window.clearTimeout(t);
  }, [navPending]);

  const startAction = useCallback(() => {
    setActionCount((c) => c + 1);
  }, []);

  const endAction = useCallback(() => {
    setActionCount((c) => Math.max(0, c - 1));
  }, []);

  const withActionLoading = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      startAction();
      try {
        return await action();
      } finally {
        endAction();
      }
    },
    [startAction, endAction]
  );

  const isBusy = actionCount > 0 || navPending;

  return (
    <AdminActionLoadingContext.Provider
      value={{ isBusy, withActionLoading, startAction, endAction }}
    >
      <div className="relative w-full min-w-0">
        <div
          className={isBusy ? 'invisible pointer-events-none absolute inset-0 overflow-hidden' : undefined}
          aria-hidden={isBusy}
        >
          {children}
        </div>
        {isBusy ? (
          <div className="w-full min-w-0" role="status" aria-live="polite" aria-label="Loading">
            <AdminPageSkeleton variant={skeletonVariantForPath(pathname)} />
          </div>
        ) : null}
      </div>
    </AdminActionLoadingContext.Provider>
  );
}

export function useAdminActionLoading() {
  const ctx = useContext(AdminActionLoadingContext);
  if (!ctx) {
    return {
      isBusy: false,
      withActionLoading: async <T,>(action: () => Promise<T>) => action(),
      startAction: () => {},
      endAction: () => {},
    } satisfies AdminActionLoadingContextValue;
  }
  return ctx;
}
