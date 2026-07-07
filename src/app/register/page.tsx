"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Church, QrCode, ScanLine, ArrowLeft } from 'lucide-react';
import { QRScanner } from '@/components/ui/qr-scanner';

export default function RegisterEntryPage() {
  const [showScanner, setShowScanner] = useState(false);

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
              &ldquo;Join us for worship, fellowship, and spiritual growth. Live streaming, prayer wall, events, and more.&rdquo;
            </p>
            <footer className="text-sm text-white/50 font-sans tracking-wide">
              — Grace Community Church
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side: Register Card Container */}
      <div className="lg:p-8 flex items-center justify-center min-h-screen bg-transparent">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[360px] px-4">
          <div className="flex flex-col space-y-2 text-center">
            {/* Mobile-Only Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Church className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Register to Grace</h1>
            <p className="text-sm text-muted-foreground">
              Registration is available via campus QR codes
            </p>
          </div>

          <Card className="border-border/50 shadow-elevated bg-card/50 backdrop-blur-xl">
            <CardContent className="p-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto ring-1 ring-primary/20">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Ready to Join?</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Please scan the QR code located at your local campus registration desk or provided by a campus leader.
                </p>
              </div>

              <Button 
                size="lg" 
                className="w-full h-12 text-sm gap-2 shadow-lg shadow-primary/10 hover-lift"
                onClick={() => setShowScanner(true)}
              >
                <ScanLine className="w-4 h-4" />
                Scan Campus QR
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary transition-colors font-medium">
              Sign In
            </Link>
          </p>

          <p className="text-center text-xs">
            <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </p>
        </div>
      </div>

      {/* QR Scanner Overlay */}
      {showScanner && (
        <QRScanner onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
