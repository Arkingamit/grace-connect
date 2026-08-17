"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { RegistrationForm } from '@/components/ui/registration-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Church, AlertTriangle, ArrowRight } from 'lucide-react';

export default function CampusRegisterPage() {
  const params = useParams();
  const campusId = params.campusId as string;
  const { campuses } = useAdminData();

  const campus = campuses.find(c => c.id === campusId);

  // Invalid campus — show error
  if (!campus) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Church className="w-6 h-6 text-white" />
              </div>
            </Link>
          </div>
          <Card className="border-border/50 shadow-elevated">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold">Campus Not Found</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The QR code you scanned doesn&apos;t match any active campus.
                Please try again or register manually.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/register">
                  <Button className="w-full gap-2">
                    Register Manually <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <RegistrationForm lockedCampusId={campusId} />;
}
