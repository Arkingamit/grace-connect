"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Capacitor } from "@capacitor/core";
import { GoogleLogin } from "@react-oauth/google";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import ModernLoginSignup from "@/components/ui/modern-login-signup";
import { signInWithGoogleNative, googleNativeSignInError } from "@/lib/grace-google-auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);

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

  return (
    <ModernLoginSignup
      initialMode="signup"
      error={error}
      useNativeButtons={isNative}
      onGoogleClick={handleContinue}
      googleSlot={googleSlot}
      registerHref="/register"
      privacyHref="/privacy-policy"
    />
  );
}
