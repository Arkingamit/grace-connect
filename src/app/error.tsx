'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[22rem] rounded-3xl border border-[#E5D5C5] bg-white p-7 text-center shadow-[0_8px_30px_rgba(47,60,94,0.1)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBE8E8] text-[#810008]">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B2323]">
          Grace Connect
        </p>
        <h2 className="mb-2 text-xl font-bold tracking-tight text-[#1A202C]">
          We&apos;re updating the app
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-[#5B6470]">
          Grace Connect hit a snag. Try again after sometime, or contact admin Arkin Gamit if the problem persists.
        </p>
        <Button onClick={() => reset()} className="h-11 w-full rounded-full gap-2 bg-[#810008] hover:bg-[#721515]">
          <RefreshCcw className="w-4 h-4" /> Try again
        </Button>
      </div>
    </div>
  );
}
