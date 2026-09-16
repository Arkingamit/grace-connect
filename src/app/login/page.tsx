"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type VerifyOrLoginResult } from "@/lib/auth-context";
import { Capacitor } from "@capacitor/core";
import { useGoogleLogin } from "@react-oauth/google";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { signInWithGoogleNative, googleNativeSignInError } from "@/lib/grace-google-auth";
import { startAppleBrowserFlow, waitForAppleFlow } from "@/lib/apple-browser-flow";
import { appleWebStartHref } from "@/lib/apple-web-config";
import { QRScanner } from "@/components/ui/qr-scanner";
import Link from "next/link";
import { ArrowLeft, ArrowRight, QrCode } from "lucide-react";
import {
  AuthCard,
  AuthPageShell,
  authPrimaryBtnClass,
  authSocialBtnClass,
} from "@/components/ui/auth-layout";
import { ViewRegistrationPassButton } from "@/components/ui/registration-pass-dialog";
import graceLogo from "../../../assets/logo.png";

/**
 * Unified Login Page
 *
 * Flow:
 *   1. User sees Google/Apple sign-in buttons
 *   2. After OAuth verification, the backend checks if the email is registered
 *      - Existing + approved → auto-login, redirect to /
 *      - Existing + pending  → show "pending approval" message
 *      - Existing + rejected → show rejection message
 *      - New user            → show QR scanner, then redirect to /register/[campusId]
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOrLogin } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Store the credential and provider after verification so registration can use it
  const [pendingCredential, setPendingCredential] = useState<{
    credential: string;
    provider: "google" | "apple";
    picture?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    const initNative = () => {
      const isCapacitor = Capacitor.isNativePlatform();
      setIsNative(isCapacitor);

      if (isCapacitor) {
        setIsIOS(Capacitor.getPlatform() === "ios");
        try {
          if (Capacitor.getPlatform() === "ios") {
            GoogleAuth.initialize({
              clientId:
                "641349616597-5npf7tgp6ifsu9evc1h4oe328rr8o12c.apps.googleusercontent.com",
              scopes: ["profile", "email"],
              grantOfflineAccess: true,
            });
          } else {
            GoogleAuth.initialize({
              clientId:
                "641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com",
              scopes: ["profile", "email"],
              grantOfflineAccess: true,
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    initNative();
    const timer = setTimeout(initNative, 500);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const appleError = searchParams.get("appleError");
    if (appleError) {
      setNotice("");
      setError(appleError);
    }
  }, [searchParams]);

  /** Handle the result from verify-or-login */
  const handleVerifyResult = useCallback(
    (result: VerifyOrLoginResult, credential: string, provider: "google" | "apple", picture?: string) => {
      setVerifying(false);
      setNotice("");

      switch (result.status) {
        case "existing":
          // Already registered and approved — redirect home
          router.push("/");
          break;

        case "new":
          // New user — store credential, show QR scanner
          setPendingCredential({ credential, provider, picture });
          // Save to sessionStorage so the registration form can pick it up
          try {
            sessionStorage.setItem(
              "grace-verified-credential",
              JSON.stringify({ credential, provider, picture, email: result.email })
            );
          } catch {
            // private mode
          }
          setShowScanner(true);
          break;

        case "pending":
          router.push("/");
          break;

        case "rejected":
          setError(result.error || "Your registration was not approved.");
          break;

        default:
          setError(result.error || "Verification failed. Please try again.");
          break;
      }
    },
    [router]
  );

  /** Google web popup success — access token is verified server-side */
  const handleGoogleAccessToken = useCallback(
    async (accessToken: string) => {
      setError("");
      if (!accessToken) {
        setError("Google authentication failed. No credential received.");
        return;
      }

      setVerifying(true);
      setNotice("Verifying your account…");

      let picture: string | undefined;
      try {
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (typeof profile?.picture === "string") picture = profile.picture;
        }
      } catch {
        // Avatar is optional
      }

      const result = await verifyOrLogin(accessToken, "google", picture);
      handleVerifyResult(result, accessToken, "google", picture);
    },
    [handleVerifyResult, verifyOrLogin]
  );

  const handleGoogleError = () => {
    setError("Google authentication failed. Please try again.");
  };

  const startWebGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      void handleGoogleAccessToken(tokenResponse.access_token);
    },
    onError: handleGoogleError,
    scope: "openid email profile",
    prompt: "select_account",
  });

  /** Native Google login (Android Credential Manager / iOS GoogleAuth) */
  const handleNativeGoogleLogin = async () => {
    try {
      setError("");
      setVerifying(true);
      setNotice("Verifying your account…");
      const resultNative = await signInWithGoogleNative();
      const idToken = resultNative.idToken;
      const picture = resultNative.imageUrl;

      if (!idToken) {
        setVerifying(false);
        setNotice("");
        setError("Google authentication failed. No ID Token received.");
        return;
      }

      const result = await verifyOrLogin(idToken, "google", picture);
      handleVerifyResult(result, idToken, "google", picture);
    } catch (err: any) {
      setVerifying(false);
      setNotice("");
      console.error(err);
      setError(googleNativeSignInError(err));
    }
  };

  /** Apple sign-in */
  const handleAppleLogin = async () => {
    // Android: in-app browser flow
    if (isNative && !isIOS) {
      setError("");
      setNotice("Opening Apple sign-in…");

      try {
        const flow = await startAppleBrowserFlow({ intent: "login", redirectTo: "/" });
        const verified = waitForAppleFlow(flow.state);
        window.location.href = flow.url;

        const outcome = await verified;
        if (!outcome.ok) {
          setNotice("");
          if (!outcome.timedOut) {
            setError(outcome.error || "Apple sign-in failed. Please try again.");
          }
          return;
        }

        setNotice("Finishing Apple sign-in…");
        const res = await fetch("/api/auth/apple/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: flow.state }),
        });
        const data = await res.json().catch(() => ({}));
        setNotice("");
        if (!res.ok || !data?.success) {
          setError(data?.error || "Apple sign-in failed. Please try again.");
          return;
        }
        window.location.href = "/";
      } catch (err: any) {
        setNotice("");
        setError(err?.message || "Could not start Apple sign-in. Please try again.");
      }
      return;
    }

    // iOS native or web
    try {
      setError("");
      setNotice("");

      if (isNative && isIOS) {
        // iOS native Apple sign-in
        const result = await SignInWithApple.authorize({
          clientId:
            process.env.NEXT_PUBLIC_APPLE_IOS_CLIENT_ID || "com.graceconnect.app",
          scopes: "email name",
          redirectURI: "https://graceconnect.graceahmedabad.org/login",
        });
        if (result.response && result.response.identityToken) {
          setVerifying(true);
          setNotice("Verifying your account…");
          const verifyResult = await verifyOrLogin(result.response.identityToken, "apple");
          handleVerifyResult(verifyResult, result.response.identityToken, "apple");
        } else {
          setError("Apple authentication failed. No ID token received.");
        }
      } else {
        // Web Apple sign-in
        setNotice("Opening Apple sign-in…");
        window.location.href = appleWebStartHref({ intent: "login", redirectTo: "/" });
      }
    } catch (err: any) {
      setVerifying(false);
      setNotice("");
      console.error(err);
      const message = err?.message || err?.errorMessage || "";
      setError(
        /cancel/i.test(message)
          ? "Apple login was canceled."
          : message || "Native Apple login failed. Please try again."
      );
    }
  };

  const handleContinue = () => {
    if (isNative) {
      void handleNativeGoogleLogin();
      return;
    }
    startWebGoogleLogin();
  };

  // ── Social login buttons ──
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

  return (
    <>
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

          {/* Heading & Community Features */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">
              Sign in to view Community Features
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
              These features are exclusive to Grace Community members. Please sign in or register to access this content.
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
          </div>

          {/* Error / Notice messages */}
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

          {/* Social login buttons */}
          <div className="flex w-full flex-col items-stretch gap-3">
            {!mounted ? (
              <>
                <div className="h-12 w-full animate-pulse rounded-2xl bg-[#FBE8E8]" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-[#FBE8E8]" />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={verifying}
                  className={`${authSocialBtnClass} disabled:opacity-60`}
                >
                  {GoogleIcon}
                  Continue with Google
                </button>

                {/* Apple */}
                {isNative ? (
                  <button
                    type="button"
                    onClick={handleAppleLogin}
                    disabled={verifying}
                    className={`${authSocialBtnClass} disabled:opacity-60`}
                  >
                    {AppleIcon}
                    Continue with Apple
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={() => {
                      setError("");
                      setNotice("Opening Apple sign-in…");
                      window.location.href = appleWebStartHref({ intent: "login", redirectTo: "/" });
                    }}
                    className={`${authSocialBtnClass} disabled:opacity-60`}
                  >
                    {AppleIcon}
                    Continue with Apple
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-4">
            <ViewRegistrationPassButton className="w-full border-[#E5D5C5]/60 text-[#8B2323]" />
          </div>

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

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#7A6150] hover:text-[#1A202C]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </p>
      </AuthPageShell>

      {/* QR Scanner — shown after verification for new users */}
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
