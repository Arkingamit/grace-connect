"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Capacitor } from "@capacitor/core";
import { GoogleLogin } from "@react-oauth/google";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import ModernLoginSignup from "@/components/ui/modern-login-signup";
import { signInWithGoogleNative, googleNativeSignInError } from "@/lib/grace-google-auth";
import { startAppleBrowserFlow, waitForAppleFlow } from "@/lib/apple-browser-flow";
import { appleWebStartHref } from "@/lib/apple-web-config";
import { QRScanner } from "@/components/ui/qr-scanner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    setMounted(true);

    const initNative = () => {
      // Capacitor 5+ uses isNativePlatform(); `.isNative` is gone, and the
      // Android-only WebView UA check never matches iOS WKWebView — so iOS
      // was falling back to Google's web widget, which Google blocks in-app.
      const isCapacitor = Capacitor.isNativePlatform();
      const isAndroidWebView =
        typeof navigator !== "undefined" &&
        /wv|Android.*AppleWebKit/i.test(navigator.userAgent);

      if (isCapacitor || isAndroidWebView) {
        setIsNative(true);
        setIsIOS(Capacitor.getPlatform() === "ios");
        try {
          // On Android the native plugin must use the Web client ID for requestIdToken.
          // Prefer capacitor.config / strings.xml; only pass iOS client on iOS.
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
    setTimeout(initNative, 500);
  }, [router]);

  useEffect(() => {
    const appleError = searchParams.get("appleError");
    if (appleError) {
      setNotice("");
      setError(appleError);
    }
  }, [searchParams]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    if (!credentialResponse.credential) {
      setError("Google authentication failed. No credential received.");
      return;
    }

    const result = await login(credentialResponse.credential, "google");
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }
  };

  const handleNativeGoogleLogin = async () => {
    try {
      setError("");
      // Android: Credential Manager (Grace Music strategy). iOS: Codetrix GoogleAuth.
      const resultNative = await signInWithGoogleNative();
      const idToken = resultNative.idToken;
      const picture = resultNative.imageUrl;

      if (!idToken) {
        setError("Google authentication failed. No ID Token received.");
        return;
      }

      const result = await login(idToken, "google", picture);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err: any) {
      console.error(err);
      setError(googleNativeSignInError(err));
    }
  };

  const handleAppleLogin = async () => {
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

    try {
      setError("");
      setNotice("");
      const result = await SignInWithApple.authorize({
        clientId:
          process.env.NEXT_PUBLIC_APPLE_IOS_CLIENT_ID || "com.graceconnect.app",
        scopes: "email name",
        redirectURI: "https://graceconnect.graceahmedabad.org/login",
      });
      if (result.response && result.response.identityToken) {
        const authResult = await login(result.response.identityToken, "apple");
        if (authResult.success) {
          router.push("/");
        } else {
          setError(authResult.error || "Login failed");
        }
      } else {
        setError("Apple authentication failed. No ID token received.");
      }
    } catch (err: any) {
      console.error(err);
      const message = err?.message || err?.errorMessage || "";
      setError(
        /cancel/i.test(message)
          ? "Apple login was canceled."
          : message || "Native Apple login failed. Please try again."
      );
    }
  };

  const handleGoogleError = () => {
    setError("Google authentication failed. Please try again.");
  };

  const handleContinue = () => {
    if (isNative) {
      void handleNativeGoogleLogin();
      return;
    }
    const btn = document.querySelector("#grace-google-login div[role='button']") as HTMLElement | null;
    if (btn) btn.click();
    else void handleNativeGoogleLogin();
  };

  const googleSlot = !mounted ? (
    <div className="h-12 w-full animate-pulse rounded-2xl bg-[#FBE8E8]" />
  ) : isNative ? undefined : (
    <div className="relative h-12 w-full">
      <div
        id="grace-google-login"
        className="pointer-events-none absolute inset-0 opacity-0"
        aria-hidden
      >
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          shape="pill"
          text="signin_with"
          width="400"
        />
      </div>
      <button
        type="button"
        onClick={handleContinue}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-transparent px-3 text-sm font-semibold text-[#1A202C]"
      >
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
        Google
      </button>
    </div>
  );

  const appleSlot = !mounted ? (
    <div className="h-12 w-full animate-pulse rounded-2xl bg-[#FBE8E8]" />
  ) : (
    <button
      type="button"
      onClick={() => {
        setError("");
        setNotice("Opening Apple sign-in…");
        window.location.href = appleWebStartHref({ intent: "login", redirectTo: "/" });
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-transparent px-3 text-sm font-semibold text-[#1A202C]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
      </svg>
      Apple
    </button>
  );

  return (
    <>
    <ModernLoginSignup
      initialMode="signup"
      error={error}
      notice={notice}
      useNativeButtons={isNative}
      onGoogleClick={handleContinue}
      onAppleClick={handleAppleLogin}
      googleSlot={googleSlot}
      appleSlot={appleSlot}
      onScanCampus={() => setShowScanner(true)}
      registerHref="/register"
      privacyHref="/privacy-policy"
    />
    {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </>
  );
}
