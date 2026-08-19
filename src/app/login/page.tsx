"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Capacitor } from "@capacitor/core";
import { GoogleLogin } from "@react-oauth/google";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import AppleLogin from "react-apple-signin-auth";
import ModernLoginSignup from "@/components/ui/modern-login-signup";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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
          const iosClientId =
            "641349616597-5npf7tgp6ifsu9evc1h4oe328rr8o12c.apps.googleusercontent.com";
          const webClientId =
            "641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com";
          GoogleAuth.initialize({
            clientId:
              Capacitor.getPlatform() === "ios" ? iosClientId : webClientId,
            scopes: ["profile", "email"],
            grantOfflineAccess: true,
          });
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

  const handleAppleWebSuccess = async (response: any) => {
    setError("");
    if (response.error) {
      setError("Apple authentication failed or was canceled.");
      return;
    }
    const idToken = response.authorization?.id_token;
    if (!idToken) {
      setError("Apple authentication failed. No ID token received.");
      return;
    }

    const result = await login(idToken, "apple");
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }
  };

  const handleNativeGoogleLogin = async () => {
    try {
      setError("");
      const user = await GoogleAuth.signIn();
      if (!user.authentication.idToken) {
        setError("Google authentication failed. No ID Token received.");
        return;
      }
      const result = await login(user.authentication.idToken, "google", user.imageUrl);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err: any) {
      console.error(err);
      const message = err?.message || err?.errorMessage || "";
      setError(
        /cancel/i.test(message)
          ? "Google login was canceled."
          : /something went wrong|developer_error|error code: 10|12500/i.test(
                message
              )
            ? "Google sign-in is not set up for this Android build. Use the reviewer button, or try again after the next app update."
            : message || "Google login failed. Please try again."
      );
    }
  };

  const handleNativeAppleLogin = async () => {
    try {
      setError("");
      const result = await SignInWithApple.authorize({
        clientId: "com.graceconnect.app",
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

  const googleSlot = !mounted ? (
    <div className="h-11 w-full animate-pulse rounded-xl bg-[#F3EAE1]/80" />
  ) : (
    <div className="flex w-full justify-center [&>div]:!w-full [&>div>div]:!w-full [&_iframe]:!w-full">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme="outline"
        size="large"
        shape="pill"
        text="signin_with"
        width="100%"
      />
    </div>
  );

  const appleSlot = !mounted ? (
    <div className="h-11 w-full animate-pulse rounded-xl bg-[#F3EAE1]/80" />
  ) : (
    <div className="flex w-full justify-center">
      <AppleLogin
        authOptions={{
          clientId:
            process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "com.graceconnect.web",
          redirectURI:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : "",
          usePopup: true,
          scope: "email name",
        }}
        uiType="dark"
        onSuccess={handleAppleWebSuccess}
        onError={(err: any) => handleAppleWebSuccess({ error: err })}
        render={(renderProps) => (
          <button
            type="button"
            onClick={renderProps.onClick}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#1A202C] bg-[#1A202C] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2d3748]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
            </svg>
            Continue with Apple
          </button>
        )}
      />
    </div>
  );

  return (
    <ModernLoginSignup
      error={error}
      useNativeButtons={isNative}
      showApple={!isNative || isIOS}
      onGoogleClick={handleNativeGoogleLogin}
      onAppleClick={handleNativeAppleLogin}
      googleSlot={googleSlot}
      appleSlot={appleSlot}
      registerHref="/register"
      privacyHref="/privacy-policy"
    />
  );
}
