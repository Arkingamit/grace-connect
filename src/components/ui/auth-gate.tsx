"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  AuthCard,
  authPrimaryBtnClass,
} from "@/components/ui/auth-layout";
import { PendingApprovalCard } from "@/components/ui/registration-pass-dialog";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";
import graceLogo from "../../../assets/logo.png";

interface AuthGateProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  showBack?: boolean;
  /** `embed` matches home-page cards. `page` is the full sign-in gate. */
  variant?: "page" | "embed";
}

export function AuthGate({
  children,
  title,
  description,
  className = "",
  showBack = true,
  variant = "page",
}: AuthGateProps) {
  const { session, getSessionMember, isLoading } = useAuth();
  const { goBack } = useNavigationHistory();
  const member = getSessionMember();

  if (isLoading) return null;

  const isApprovedMember = Boolean(
    session && member?.status !== "pending" && member?.status !== "rejected"
  );

  if (isApprovedMember) {
    return <>{children}</>;
  }

  const isPending = member?.status === "pending";
  const isRejected = member?.status === "rejected";

  const isEmbed = variant === "embed";

  if (isPending) {
    return (
      <div className={`relative w-full flex items-center justify-center ${isEmbed ? "" : "px-4 py-10 pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+1.25rem))]"} ${className}`}>
        <div className={`relative z-10 w-full ${isEmbed ? "" : "max-w-[400px]"}`}>
          {showBack && (
            <button
              type="button"
              onClick={() => goBack("/")}
              className="mb-4 inline-flex items-center gap-2 pl-1 text-[#7A6150] transition-colors hover:text-[#8B2323]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </button>
          )}
          <PendingApprovalCard />
        </div>
      </div>
    );
  }

  const heading = isRejected ? "Registration not approved" : "Sign in to view Community Features";
  const body = isRejected
    ? "Your campus leader did not approve this registration. Please contact your campus for help."
    : (description ||
      "These features are exclusive to Grace Community members. Please sign in or register to access this content.");

  const cardInner = (
    <>
      <Link href="/" className={`flex justify-center ${isEmbed ? "mb-3" : "mb-6"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={graceLogo.src}
          alt="Grace Ahmedabad"
          className={isEmbed ? "h-10 w-auto max-w-[180px] object-contain" : "h-20 w-auto max-w-[280px] object-contain"}
        />
      </Link>

      <div className={`text-center ${isEmbed ? "mb-4" : "mb-6"}`}>
        <h3 className={`font-bold tracking-tight text-[#1A202C] ${isEmbed ? "text-lg leading-snug" : "text-3xl"}`}>
          {heading}
        </h3>
        <p className={`leading-relaxed text-[#7A6150] ${isEmbed ? "mt-1.5 text-xs" : "mt-2 text-sm"}`}>
          {body}
        </p>
        {!isRejected && !isEmbed && (
          <ul className="mt-4 space-y-2 text-left text-sm text-[#7A6150]">
            {[
              "Announcements",
              "Events",
              "Prayer Wall",
              "Photo Gallery",
              "Notes",
              "Exclusive Sermons",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B2323]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isRejected ? (
        <Link href="/" className={authPrimaryBtnClass}>
          Back to Home
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <Link href="/login" className={authPrimaryBtnClass}>
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {!isEmbed && (
        <p className="mt-6 text-center text-xs leading-relaxed text-[#C4B0A0]">
          By continuing you agree to Grace Community&apos;s{" "}
          <Link href="/privacy-policy" className="font-medium text-[#8B2323] hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-medium text-[#8B2323] hover:underline">
            Privacy Policy
          </Link>
          .{" "}
          <Link href="/support" className="font-medium text-[#8B2323] hover:underline">
            Support
          </Link>
          .
        </p>
      )}
    </>
  );

  if (isEmbed) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#F3EAE1]">
          {cardInner}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full flex items-center justify-center px-4 py-10 pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+1.25rem))] ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "var(--bg-pattern)",
          backgroundRepeat: "repeat",
          backgroundSize: "240px 240px",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[400px]">
        {showBack && (
          <button
            type="button"
            onClick={() => goBack("/")}
            className="mb-4 inline-flex items-center gap-2 pl-1 text-[#7A6150] transition-colors hover:text-[#8B2323]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg font-medium">Back</span>
          </button>
        )}
        <AuthCard>{cardInner}</AuthCard>
      </div>
    </div>
  );
}
