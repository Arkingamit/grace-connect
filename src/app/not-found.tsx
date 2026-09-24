import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[22rem] rounded-3xl border border-[#E5D5C5] bg-white p-7 text-center shadow-[0_8px_30px_rgba(47,60,94,0.1)]">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B2323]">
          Grace Connect
        </p>
        <h1 className="mb-2 text-xl font-bold tracking-tight text-[#1A202C]">
          Page not found
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-[#5B6470]">
          This page is not available. Go back home and try again.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#810008] text-sm font-semibold text-white hover:bg-[#721515]"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
