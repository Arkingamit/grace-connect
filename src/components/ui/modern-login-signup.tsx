"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export interface ModernLoginSignupProps {
  error?: string;
  googleSlot?: React.ReactNode;
  appleSlot?: React.ReactNode;
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  /** When true, show native-style buttons instead of OAuth widget slots */
  useNativeButtons?: boolean;
  registerHref?: string;
  privacyHref?: string;
  termsHref?: string;
  initialMode?: "login" | "signup";
}

export default function ModernLoginSignup({
  error,
  googleSlot,
  appleSlot,
  onGoogleClick,
  onAppleClick,
  useNativeButtons = false,
  registerHref = "/register",
  privacyHref = "/privacy-policy",
  termsHref = "/privacy-policy",
  initialMode = "login",
}: ModernLoginSignupProps) {
  const [isLogin, setIsLogin] = useState(initialMode === "login");

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  const AppleIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
    </svg>
  );

  const SocialButtons = useNativeButtons ? (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={onGoogleClick}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E5D5C5] bg-white px-4 py-3 text-sm font-medium text-[#1A202C] shadow-sm transition-colors hover:bg-[#FAF7F2]"
      >
        {GoogleIcon}
        {isLogin ? "Continue with Google" : "Sign up with Google"}
      </button>
      <button
        type="button"
        onClick={onAppleClick}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#1A202C] bg-[#1A202C] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2d3748]"
      >
        {AppleIcon}
        {isLogin ? "Continue with Apple" : "Sign up with Apple"}
      </button>
    </div>
  ) : (
    <div className="flex w-full flex-col items-center gap-3">
      {googleSlot}
      {appleSlot}
    </div>
  );

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FAF7F2] p-4 pb-24 text-[#1A202C]">
      {/* Pattern + ambient accents */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{ backgroundImage: "var(--bg-pattern)", backgroundSize: "100px 100px" }}
      />
      <div className="pointer-events-none absolute right-[-5%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-[#8B2323]/5 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[40rem] w-[40rem] rounded-full bg-[#5C1111]/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-[#E5D5C5]/60 bg-white/80 p-8 shadow-xl backdrop-blur-xl sm:p-10">
          <div className="pointer-events-none absolute inset-2 rounded-[1.5rem] border border-[#8B2323]/5" />

          {isLogin ? (
            <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
              <div className="mb-6 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Grace Community"
                  className="h-20 w-auto object-contain"
                />
              </div>

              <h1 className="mb-2 font-serif text-3xl font-bold text-[#1A202C]">
                Welcome Back
              </h1>
              <p className="mb-8 text-sm text-[#7A6150]">
                Sign in to your account to access Grace Community.
              </p>

              {error && (
                <div className="mb-6 flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-left text-sm font-medium text-[#8B2323]">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {SocialButtons}

              <Link
                href="/demo"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8B2323] bg-[#FBE8E8] px-4 py-3 text-sm font-semibold text-[#8B2323] shadow-sm transition-colors hover:bg-[#F3D4D4] active:scale-[0.99]"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                App Store / Play reviewer access
              </Link>

              <div className="mt-8 w-full space-y-4 border-t border-[#E5D5C5]/50 pt-6">
                <p className="text-sm text-[#7A6150]">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="font-bold text-[#8B2323] underline-offset-4 transition-all hover:underline"
                  >
                    Sign Up
                  </button>
                </p>

                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-[#7A6150] transition-colors hover:text-[#1A202C]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-[#7A6150]/70">
                By proceeding, you agree to Grace Community&apos;s{" "}
                <Link href={termsHref} className="font-medium text-[#8B2323] hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href={privacyHref} className="font-medium text-[#8B2323] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
              <div className="mb-6 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Grace Community"
                  className="h-20 w-auto object-contain"
                />
              </div>

              <h1 className="mb-2 font-serif text-3xl font-bold text-[#1A202C]">
                Join Grace
              </h1>
              <p className="mb-8 text-sm text-[#7A6150]">
                Registration is available via campus QR codes.
              </p>

              <Link
                href={registerHref}
                className="mb-6 flex w-full items-center justify-center rounded-xl bg-[#8B2323] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#721515]"
              >
                Continue to Registration
              </Link>

              <div className="mb-6 h-px w-full bg-[#E5D5C5]/50" />

              {SocialButtons}

              <Link
                href="/demo"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8B2323] bg-[#FBE8E8] px-4 py-3 text-sm font-semibold text-[#8B2323] shadow-sm transition-colors hover:bg-[#F3D4D4] active:scale-[0.99]"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                App Store / Play reviewer access
              </Link>

              <div className="mt-8 w-full space-y-4 border-t border-[#E5D5C5]/50 pt-6">
                <p className="text-sm text-[#7A6150]">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="font-bold text-[#8B2323] underline-offset-4 transition-all hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-[#7A6150]/70">
                By proceeding, you agree to Grace Community&apos;s{" "}
                <Link href={termsHref} className="font-medium text-[#8B2323] hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href={privacyHref} className="font-medium text-[#8B2323] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs font-medium text-[#7A6150]/60">
          &copy; {new Date().getFullYear()} Grace Community Church
        </p>
      </div>
    </div>
  );
}
