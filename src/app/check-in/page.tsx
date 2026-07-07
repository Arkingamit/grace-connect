"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QrCode } from 'lucide-react';
import { SessionQRScanner } from '@/components/ui/session-qr-scanner';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export default function CheckInPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetch('/api/attendance/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckIn = async (session: any) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Geolocation.requestPermissions();
      } catch (e) {
        console.warn("Native location permission request failed", e);
      }
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setCheckingIn(session._id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: session._id,
              type: session.type || 'session',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });
          
          const data = await res.json();
          
          if (res.ok) {
            setStatus(prev => ({ ...prev, [session._id]: { success: true, message: 'Successfully checked in!' } }));
            toast.success("Checked in successfully!");
          } else {
            setStatus(prev => ({ ...prev, [session._id]: { success: false, message: data.message || data.error } }));
            toast.error(data.message || data.error);
          }
        } catch (e) {
          toast.error("Failed to connect to server");
          setStatus(prev => ({ ...prev, [session._id]: { success: false, message: 'Connection failed' } }));
        }
        setCheckingIn(null);
      },
      (error) => {
        setCheckingIn(null);
        let msg = "Failed to get location.";
        if (error.code === 1) msg = "Location permission denied. Please enable GPS.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-transparent pb-24">
      <div className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#E5D5C5]/40 shadow-sm pt-4 pb-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7A6150] shadow-sm shrink-0 hover:bg-[#F3EAE1] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold font-serif text-[#1A202C]">Check-In</h1>
        </div>
      </div>

      <div className="p-4 mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#8B2323]" /></div>
        ) : sessions.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <MapPin className="w-12 h-12 text-[#E5D5C5] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#1A202C] mb-2">No Active Sessions</h3>
            <p className="text-sm text-[#7A6150]">There are no attendance sessions currently active for your campus.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button 
              className="w-full h-12 bg-white text-[#8B2323] hover:bg-[#F3EAE1] shadow-sm border border-[#E5D5C5] rounded-xl font-bold text-base"
              onClick={() => setShowScanner(true)}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Scan QR Code to Check-In
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#E5D5C5]" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#FAF7F2] px-2 text-[#7A6150]">Or use GPS</span></div>
            </div>

            {sessions.map(s => {
              const sessionStatus = status[s._id];
              return (
                <Card key={s._id} className="p-5 border-0 shadow-sm bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#1A202C]">{s.title}</h3>
                    <p className="text-sm text-[#7A6150]">{s.startTime} - {s.endTime}</p>
                  </div>
                  
                  {sessionStatus ? (
                    <div className={`p-4 rounded-xl flex items-start gap-3 ${sessionStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {sessionStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                      <p className="text-sm font-medium leading-tight">{sessionStatus.message}</p>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-[#8B2323] hover:bg-[#721515] h-12 text-base font-bold rounded-xl"
                      onClick={() => handleCheckIn(s)}
                      disabled={checkingIn === s._id}
                    >
                      {checkingIn === s._id ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Location...</>
                      ) : (
                        <><MapPin className="w-5 h-5 mr-2" /> Mark Attendance</>
                      )}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showScanner && (
        <SessionQRScanner onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
