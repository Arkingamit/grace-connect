"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AuthGateProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function AuthGate({ children, title, description, className = "" }: AuthGateProps) {
  const { session } = useAuth();

  // If user is authenticated, render the content
  if (session) {
    return <>{children}</>;
  }

  // If not authenticated, render the restriction gate
  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <Card className="w-full max-w-lg p-8 sm:p-12 shadow-xl border border-[#E5D5C5]/60 bg-[#FAF7F2] rounded-3xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#8B2323]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#A04A00]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F3EAE1] flex items-center justify-center border border-[#E5D5C5]/60 shadow-sm text-[#8B2323]">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-[#1A202C]">
              Sign in to view {title}
            </h3>
            <p className="text-[#7A6150] text-sm">
              {description || `This section is exclusive to Grace Community members. Please sign in or register to access this content.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full gap-3 pt-2">
            <Button asChild className="flex-1 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl py-6 font-semibold shadow-md">
              <Link href="/login">
                Sign In <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-[#8B2323] text-[#8B2323] hover:bg-[#8B2323]/10 bg-transparent rounded-xl py-6 font-semibold">
              <Link href="/register">
                Register
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
