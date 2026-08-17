"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';

function DemoLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading: authLoading, demoLogin } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    fetch('/api/auth/demo-login')
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace('/');
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    const q = searchParams.get('code');
    if (!q || autoTried || enabled === false || authLoading || session) return;
    setAutoTried(true);
    setCode(q);
    void runLogin(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, enabled, authLoading, session, autoTried]);

  const runLogin = async (accessCode: string) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await demoLogin(accessCode);
      if (result.success) {
        router.replace('/');
        return;
      }
      setError(result.error || 'Unable to start demo session');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Enter the reviewer access code');
      return;
    }
    await runLogin(code.trim());
  };

  if (enabled === null || authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B2323]" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2] p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-[#E5D5C5]/60 bg-white/90 p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#7A6150]" />
          <h1 className="mb-2 font-serif text-2xl font-bold text-[#1A202C]">Demo unavailable</h1>
          <p className="mb-6 text-sm text-[#7A6150]">
            App Store / Play reviewer access is not enabled on this environment.
          </p>
          <Link href="/login" className="text-sm font-semibold text-[#8B2323] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FAF7F2] p-4">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{ backgroundImage: 'var(--bg-pattern)', backgroundSize: '100px 100px' }}
      />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-[#E5D5C5]/60 bg-white/90 p-8 shadow-xl backdrop-blur-xl sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Grace Community" className="mb-4 h-16 w-auto object-contain" />
          <div className="mb-3 flex items-center gap-2 rounded-full border border-[#E5C5C5] bg-[#FBE8E8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8B2323]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Store review access
          </div>
          <h1 className="mb-2 font-serif text-3xl font-bold text-[#1A202C]">Demo View</h1>
          <p className="text-sm text-[#7A6150]">
            Enter the access code provided in the App Store / Google Play review notes to browse
            Grace Connect as a member without Google or Apple sign-in.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-[#8B2323]">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="demo-code" className="font-semibold text-[#3A2D27]">
              Access code
            </Label>
            <Input
              id="demo-code"
              type="password"
              autoComplete="one-time-code"
              placeholder="Reviewer access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 rounded-xl border-[#E5D5C5]/60 bg-[#FAF7F2]"
              disabled={submitting}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-[#8B2323] text-white hover:bg-[#721515]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting demo…
              </>
            ) : (
              'Enter demo as member'
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#E5D5C5]/50 pt-5 text-sm">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[#7A6150] transition-colors hover:text-[#1A202C]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2]">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B2323]" />
        </div>
      }
    >
      <DemoLoginForm />
    </Suspense>
  );
}
