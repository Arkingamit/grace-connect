"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Church, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if super admin exists
    fetch('/api/setup')
      .then(res => res.json())
      .then(data => {
        if (!data.hasSuperAdmin) {
          router.push('/setup');
        }
      })
      .catch(console.error);
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

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background text-foreground">
      {/* Left Side: Premium Aesthetic Panel */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        {/* Elegant Dark Gradient */}
        <div className="absolute inset-0 bg-zinc-950 bg-gradient-to-b from-[#8B2323] via-zinc-950 to-zinc-950" />
        
        {/* Clean Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

        {/* Ambient Blurred Accents */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-800/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-20 flex items-center gap-2.5 font-medium text-lg font-serif">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Church className="w-5 h-5 text-white" />
          </div>
          <span className="tracking-wide">Grace Community</span>
        </div>

        {/* Quote */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg font-serif italic text-white/95 leading-relaxed">
              &ldquo;A welcoming community where faith grows, hearts connect, and lives are transformed through God&apos;s love.&rdquo;
            </p>
            <footer className="text-sm text-white/50 font-sans tracking-wide">
              — Grace Community Church
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side: Auth Card Container */}
      <div className="lg:p-8 flex items-center justify-center min-h-screen bg-transparent">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] px-4">
          <div className="flex flex-col space-y-2 text-center">
            {/* Mobile-Only Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Church className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account with Google
            </p>
          </div>

          <div className="grid gap-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-center w-full min-h-[50px] items-center">
              {!mounted ? (
                <div className="w-[342px] h-[40px] animate-pulse bg-muted rounded"></div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="signin_with"
                  width="342"
                />
              )}
            </div>
          </div>

          <p className="px-8 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline underline-offset-4 hover:text-primary transition-colors font-medium">
              Register Here
            </Link>
          </p>

          <p className="text-center text-xs">
            <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
