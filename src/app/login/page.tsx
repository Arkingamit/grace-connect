"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Church, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import AppleLogin from 'react-apple-signin-auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const initNative = () => {
      const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
      const isWebView = typeof window !== 'undefined' && /wv|Nexus|Android.*AppleWebKit/i.test(navigator.userAgent);
      
      if (isCapacitor || isWebView) {
        setIsNative(true);
        try {
          GoogleAuth.initialize({
            clientId: '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        } catch (e) {
          console.error(e);
        }
      }
    };

    initNative();
    setTimeout(initNative, 500); // Retry in case bridge injects late
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    if (!credentialResponse.credential) {
      setError('Google authentication failed. No credential received.');
      return;
    }

    const result = await login(credentialResponse.credential, 'google');
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleAppleWebSuccess = async (response: any) => {
    setError('');
    if (response.error) {
      setError('Apple authentication failed or was canceled.');
      return;
    }
    const idToken = response.authorization?.id_token;
    if (!idToken) {
      setError('Apple authentication failed. No ID token received.');
      return;
    }

    const result = await login(idToken, 'apple');
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleNativeGoogleLogin = async () => {
    try {
      setError('');
      const user = await GoogleAuth.signIn();
      if (!user.authentication.idToken) {
        setError('Google authentication failed. No ID Token received.');
        return;
      }
      const result = await login(user.authentication.idToken, 'google');
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      console.error(err);
      setError('Native Google login failed or was canceled.');
    }
  };

  const handleNativeAppleLogin = async () => {
    try {
      setError('');
      const result = await SignInWithApple.authorize({
        clientId: 'com.graceconnect.app',
        scopes: 'email name',
        redirectURI: 'https://graceconnect.graceahmedabad.org/login',
      });
      if (result.response && result.response.identityToken) {
        const authResult = await login(result.response.identityToken, 'apple');
        if (authResult.success) {
          router.push('/');
        } else {
          setError(authResult.error || 'Login failed');
        }
      } else {
        setError('Apple authentication failed. No ID token received.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Native Apple login failed or was canceled.');
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] relative overflow-hidden p-4">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
        style={{ backgroundImage: 'var(--bg-pattern)', backgroundSize: '100px 100px' }} 
      />
      
      {/* Ambient Blurred Accents */}
      <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-[#8B2323]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-[#5C1111]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-[#E5D5C5]/60 shadow-xl p-8 sm:p-10 flex flex-col items-center relative overflow-hidden">
          
          {/* Decorative subtle border inside card */}
          <div className="absolute inset-2 border border-[#8B2323]/5 rounded-[1.5rem] pointer-events-none" />

          <div className="mb-6 relative z-10 flex items-center justify-center">
            <img src="/logo.png" alt="Grace Community" className="h-20 w-auto object-contain" />
          </div>

          <h1 className="text-3xl font-serif font-bold text-[#1A202C] mb-2 text-center relative z-10">Welcome Back</h1>
          <p className="text-[#7A6150] text-sm text-center mb-8 relative z-10">
            Sign in to your account with Google to access Grace Community features.
          </p>

          <div className="w-full space-y-6 relative z-10">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 text-[#8B2323] text-sm border border-red-100 font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full items-center">
              {!mounted ? (
                <div className="w-full space-y-3">
                  <div className="w-full h-[44px] animate-pulse bg-[#F3EAE1]/50 rounded-lg"></div>
                  <div className="w-full h-[44px] animate-pulse bg-[#F3EAE1]/50 rounded-lg"></div>
                </div>
              ) : isNative ? (
                <>
                  <button
                    onClick={handleNativeGoogleLogin}
                    className="w-full bg-white text-gray-700 border border-gray-300 font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Sign in with Google
                  </button>
                  <button
                    onClick={handleNativeAppleLogin}
                    className="w-full bg-black text-white border border-black font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors shadow-sm"
                  >
                    <svg viewBox="0 0 384 512" className="w-5 h-5 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.1-44.6-35.9-2.8-74.3 22.7-93.1 22.7-18.9 0-50.1-22.1-78.8-22.1-41.1 0-79.6 23.3-100.9 61.2-42.9 76.5-11 190.2 30.6 248.9 20.4 28.7 44.5 61.2 75.3 60 30.3-1.2 41.5-19.6 77.9-19.6 36.1 0 46.5 19.3 78.2 19.3 32.5-.2 53.6-29.6 73.8-59 23.2-34 32.4-67.1 33-68.8-1-1-61.9-23.7-61.9-113.2zM250.7 77.7c16.5-20.1 27.6-47.8 24.6-75.7-24 1-52 14.1-69 32.2-15.1 16-27.9 44-24.3 71.1 26.6 2 52.2-14.8 68.7-27.6z"/></svg>
                    Sign in with Apple
                  </button>
                </>
              ) : (
                <>
                  <div className="w-full flex justify-center [&>div]:!w-full [&>div>div]:!w-full [&_iframe]:!w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      shape="rectangular"
                      text="signin_with"
                      width="100%"
                    />
                  </div>
                  <div className="w-full flex justify-center">
                    <AppleLogin
                      authOptions={{
                        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.graceconnect.web',
                        redirectURI: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
                        usePopup: true,
                        scope: 'email name'
                      }}
                      uiType="dark"
                      onSuccess={handleAppleWebSuccess}
                      onError={(error: any) => handleAppleWebSuccess({ error })}
                      render={(renderProps) => (
                        <button
                          onClick={renderProps.onClick}
                          className="w-full bg-black text-white border border-black font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors shadow-sm"
                        >
                          <svg viewBox="0 0 384 512" className="w-5 h-5 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.1-44.6-35.9-2.8-74.3 22.7-93.1 22.7-18.9 0-50.1-22.1-78.8-22.1-41.1 0-79.6 23.3-100.9 61.2-42.9 76.5-11 190.2 30.6 248.9 20.4 28.7 44.5 61.2 75.3 60 30.3-1.2 41.5-19.6 77.9-19.6 36.1 0 46.5 19.3 78.2 19.3 32.5-.2 53.6-29.6 73.8-59 23.2-34 32.4-67.1 33-68.8-1-1-61.9-23.7-61.9-113.2zM250.7 77.7c16.5-20.1 27.6-47.8 24.6-75.7-24 1-52 14.1-69 32.2-15.1 16-27.9 44-24.3 71.1 26.6 2 52.2-14.8 68.7-27.6z"/></svg>
                          Sign in with Apple
                        </button>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-6 border-t border-[#E5D5C5]/50 flex flex-col gap-4">
              <p className="text-center text-sm text-[#7A6150]">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-bold text-[#8B2323] hover:underline underline-offset-4 transition-all">
                  Register Here
                </Link>
              </p>

              <Link href="/" className="inline-flex items-center justify-center gap-1.5 text-sm text-[#7A6150] hover:text-[#1A202C] transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
              </Link>
            </div>
          </div>
        </div>
        
        {/* Footer Text */}
        <p className="text-center text-[#7A6150]/60 text-xs mt-6 font-medium">
          &copy; {new Date().getFullYear()} Grace Community Church
        </p>
      </div>
    </div>
  );
}
