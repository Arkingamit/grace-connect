"use client";

import React from "react";
import Link from "next/link";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FAF7F2] px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-28">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "var(--bg-pattern)",
          backgroundRepeat: "repeat",
          backgroundSize: "240px 240px",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border-2 border-[#8B2323]/35 bg-white/95 p-6 shadow-[0_24px_60px_-12px_rgba(26,32,44,0.22),0_8px_20px_-8px_rgba(139,35,35,0.12)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-8">
      {children}
    </div>
  );
}

export function AuthModeToggle({
  mode,
  onLogin,
  onSignup,
  loginHref,
  signupHref,
}: {
  mode: "login" | "signup";
  onLogin?: () => void;
  onSignup?: () => void;
  loginHref?: string;
  signupHref?: string;
}) {
  const loginClass =
    mode === "login"
      ? "rounded-full bg-white py-2.5 text-sm font-semibold text-[#1A202C] shadow-sm"
      : "rounded-full py-2.5 text-sm font-medium text-[#7A6150]";
  const signupClass =
    mode === "signup"
      ? "rounded-full bg-white py-2.5 text-sm font-semibold text-[#1A202C] shadow-sm"
      : "rounded-full py-2.5 text-sm font-medium text-[#7A6150]";

  return (
    <div className="mb-8 grid grid-cols-2 rounded-full border border-[#E5D5C5]/60 bg-[#FBE8E8]/70 p-1">
      {loginHref ? (
        <Link href={loginHref} className={`${loginClass} text-center`}>
          Log In
        </Link>
      ) : (
        <button type="button" onClick={onLogin} className={loginClass}>
          Log In
        </button>
      )}
      {signupHref ? (
        <Link href={signupHref} className={`${signupClass} text-center`}>
          Sign Up
        </Link>
      ) : (
        <button type="button" onClick={onSignup} className={signupClass}>
          Sign Up
        </button>
      )}
    </div>
  );
}

export const authSocialBtnClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5D5C5]/60 bg-[#FAF7F2] text-sm font-semibold text-[#1A202C] transition-colors hover:bg-[#FBE8E8]";

export const authPrimaryBtnClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C94A4A] px-4 py-3 text-center text-sm font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-[#B83A3A] active:bg-[#8B2323]";

export const authSecondaryBtnClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C94A4A] px-4 py-3 text-center text-sm font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-[#B83A3A] active:bg-[#8B2323]";
