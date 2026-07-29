"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Church, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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

    const result = await login(credentialResponse.credential);
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
      const result = await login(user.authentication.idToken);
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

            <div className="flex justify-center w-full min-h-[44px] items-center">
              {!mounted ? (
                <div className="w-full h-[44px] animate-pulse bg-[#F3EAE1]/50 rounded-lg"></div>
              ) : isNative ? (
                <button
                  onClick={handleNativeGoogleLogin}
                  className="w-full bg-white text-gray-700 border border-gray-300 font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </button>
              ) : (
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
