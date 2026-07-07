"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    const performCheckIn = async () => {
      try {
        const res = await fetch('/api/attendance/qr-check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setResult({ success: true, message: 'You have been checked in successfully!' });
          toast.success("Checked in successfully!");
        } else {
          setResult({ success: false, message: data.message || data.error });
          toast.error(data.message || data.error);
        }
      } catch (err) {
        setResult({ success: false, message: 'Failed to connect to server. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    performCheckIn();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
        
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MapPin className="w-8 h-8 text-[#8B2323]" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#1A202C]">Self Check-In</h1>
        </div>

        <Card className="w-full border-0 shadow-lg bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-8 text-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 text-[#8B2323] animate-spin" />
                <p className="text-[#7A6150] font-medium">Verifying and checking you in...</p>
              </div>
            ) : result ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                {result.success ? (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                )}
                
                <h2 className={`text-xl font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? 'Success!' : 'Check-In Failed'}
                </h2>
                <p className="text-[#7A6150] text-center">{result.message}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl bg-white text-[#1A202C]"
          onClick={() => router.push('/check-in')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Check-In Page
        </Button>
      </div>
    </div>
  );
}
