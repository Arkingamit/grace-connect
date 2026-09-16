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
}

export function AuthGate({
  children,
  title,
  description,
  className = "",
  showBack = true,
}: AuthGateProps) {
  const { session, getSessionMember, isLoading } = useAuth();
  const { goBack } = useNavigationHistory();
  const member = getSessionMember();

  if (isLoading) return null;

  if (session && member?.status !== "pending" && member?.status !== "rejected") {
    return <>{children}</>;
  }

  const pendingOrRejected = session && (member?.status === "pending" || member?.status === "rejected");

  return (
    <div className={`relative w-full flex items-center justify-center px-4 py-10 ${className}`}>
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
        <AuthCard>
          <Link href="/" className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={graceLogo.src}
              alt="Grace Ahmedabad"
              className="h-20 w-auto max-w-[280px] object-contain"
            />
          </Link>

          <div className="mb-6 text-center">
            {pendingOrRejected ? (
              member?.status === "rejected" ? (
                <>
                  <h3 className="text-3xl font-bold tracking-tight text-[#1A202C]">
                    Registration not approved
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
                    Your campus leader did not approve this registration. Please contact your campus for help.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold tracking-tight text-[#1A202C]">
                    Waiting for campus leader approval
                  </h3>
                  <div className="mt-4">
                    <PendingApprovalCard />
                  </div>
                </>
              )
            ) : (
              <>
                <h3 className="text-3xl font-bold tracking-tight text-[#1A202C]">
                  Sign in to view Community Features
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
                  {description ||
                    "These features are exclusive to Grace Community members. Please sign in or register to access this content."}
                </p>
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
              </>
            )}
          </div>

          {pendingOrRejected ? (
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
        </AuthCard>
      </div>
    </div>
  );
}

