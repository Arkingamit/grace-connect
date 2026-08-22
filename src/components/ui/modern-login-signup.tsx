"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ViewRegistrationPassButton } from "@/components/ui/registration-pass-dialog";
import {
  AuthCard,
  AuthModeToggle,
  AuthPageShell,
  authPrimaryBtnClass,
  authSocialBtnClass,
} from "@/components/ui/auth-layout";
import graceLogo from "../../../assets/logo.png";

export interface ModernLoginSignupProps {
  error?: string;
  notice?: string;
  googleSlot?: React.ReactNode;
  appleSlot?: React.ReactNode;
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  useNativeButtons?: boolean;
  showApple?: boolean;
  registerHref?: string;
  privacyHref?: string;
  termsHref?: string;
  initialMode?: "login" | "signup";
  onScanCampus?: () => void;
  loginHref?: string;
}

export default function ModernLoginSignup({
  error,
  notice,
  googleSlot,
  appleSlot,
  onGoogleClick,
  onAppleClick,
  useNativeButtons = false,
  showApple = true,
  registerHref = "/register",
  privacyHref = "/privacy-policy",
  termsHref = "/privacy-policy",
  initialMode = "signup",
  onScanCampus,
  loginHref,
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

  const hasSocial = useNativeButtons || Boolean(googleSlot) || Boolean(appleSlot);

  const socialSlotWrapClass =
    "flex h-12 w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5D5C5]/60 bg-[#FAF7F2]";

  const SocialRow = (
    <div className={`grid w-full items-stretch gap-3 ${showApple ? "grid-cols-2" : "grid-cols-1"}`}>
      {useNativeButtons ? (
        <button type="button" onClick={onGoogleClick} className={authSocialBtnClass}>
          {GoogleIcon}
          Google
        </button>
      ) : (
        <div className={`${socialSlotWrapClass} [&>div]:!h-full [&>div]:!w-full [&>div>div]:!h-full [&>div>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full`}>
          {googleSlot}
        </div>
      )}
      {showApple &&
        (useNativeButtons ? (
          <button type="button" onClick={onAppleClick} className={authSocialBtnClass}>
            {AppleIcon}
            Apple
          </button>
        ) : (
          <div className={`${socialSlotWrapClass} [&_button]:!h-full [&_button]:!w-full [&_button]:!rounded-2xl [&_button]:!border-0 [&_button]:!bg-transparent`}>
            {appleSlot}
          </div>
        ))}
    </div>
  );

  return (
    <AuthPageShell>
      <AuthCard>
        <Link href="/" className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={graceLogo.src}
            alt="Grace Ahmedabad"
            className="h-24 w-auto max-w-[320px] object-contain"
          />
        </Link>

        <AuthModeToggle
          mode={isLogin ? "login" : "signup"}
          onLogin={() => setIsLogin(true)}
          onSignup={() => setIsLogin(false)}
          loginHref={loginHref}
        />

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">
            {isLogin ? "Welcome Back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
            {isLogin
              ? "Sign in to your account to access Grace Community."
              : "Join Grace Community. Scan your campus QR code to start registration."}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#E5C5C5] bg-[#FBE8E8] px-4 py-3 text-left text-sm font-medium text-[#8B2323]">
            {error}
          </div>
        )}
        {!error && notice && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#E5D5C5]/60 bg-[#FAF7F2] px-4 py-3 text-left text-sm font-medium text-[#7A6150]">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#8B2323] border-t-transparent" />
            {notice}
          </div>
        )}

        {isLogin ? (
          <>{hasSocial && SocialRow}</>
        ) : (
          <>
            {onScanCampus ? (
              <button type="button" onClick={onScanCampus} className={authPrimaryBtnClass}>
                Scan campus QR
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link href={registerHref} className={authPrimaryBtnClass}>
                Continue to registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </>
        )}

        <div className="mt-4">
          <ViewRegistrationPassButton className="w-full border-[#E5D5C5]/60 text-[#8B2323]" />
        </div>

        <Link href="/demo" className={`${authPrimaryBtnClass} mt-3`}>
          <span>App Store / Play reviewer access</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>

        <p className="mt-6 text-center text-xs leading-relaxed text-[#C4B0A0]">
          By continuing you agree to Grace Community&apos;s{" "}
          <Link href={termsHref} className="font-medium text-[#8B2323] hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href={privacyHref} className="font-medium text-[#8B2323] hover:underline">
            Privacy Policy
          </Link>
          .{" "}
          <Link href="/support" className="font-medium text-[#8B2323] hover:underline">
            Support
          </Link>
          .
        </p>
      </AuthCard>

      <p className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A6150] hover:text-[#1A202C]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </p>
    </AuthPageShell>
  );
}
