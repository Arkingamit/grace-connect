"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/ui/auth-gate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as LucideCamera, QrCode, UserCheck, XCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

function EpassScanInner() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    memberName?: string;
    message?: string;
  } | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/attendance/active?forScanner=true');
        if (res.ok) {
          const data = await res.json();
          setSessions(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0) {
            setSelectedSessionId(data[0]._id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    if (!selectedSessionId) {
      toast.error('Please select a session first');
      return;
    }

    setScannerError(null);
    setIsScanning(true);

    try {
      if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load QR scanner library'));
          document.head.appendChild(script);
        });
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Camera.requestPermissions({ permissions: ['camera'] });
          if (status.camera === 'denied') {
            throw new Error('denied');
          }
        } catch {
          if (Capacitor.getPlatform() === 'ios') {
            await NativeSettings.openIOS({ option: IOSSettings.App });
          } else {
            await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
          }
          setIsScanning(false);
          setScannerError('Camera access denied. Please allow it in settings.');
          return;
        }
      }

      const html5QrCode = new window.Html5Qrcode('member-e-pass-scanner');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          void processScan(decodedText);
        },
        () => {},
      );
    } catch {
      setIsScanning(false);
      setScannerError('Could not start camera. Make sure permissions are enabled.');
      toast.error('Failed to start camera');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, sessions]);

  const processScan = async (qrCodeText: string) => {
    if (!selectedSessionId) return;
    await stopScanner();

    try {
      const selectedSession = sessions.find((s) => s._id === selectedSessionId);
      const isEvent = selectedSession?.type === 'event';
      const requireGps = isEvent
        ? false
        : (selectedSession?.checkInConfig?.scannerRequireGps ?? false);

      let lat = 0;
      let lon = 0;

      if (requireGps) {
        if (Capacitor.isNativePlatform()) {
          try {
            await Geolocation.requestPermissions();
          } catch (e) {
            console.warn('Native location permission request failed', e);
          }
        }
        if (!navigator.geolocation) {
          toast.error('Geolocation is not supported by your browser');
          setLastScanResult({ success: false, message: 'GPS required but not supported' });
          setTimeout(() => {
            setLastScanResult(null);
            startScanner();
          }, 3000);
          return;
        }

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch {
          toast.error('Failed to get your location. GPS is required for this session.');
          setLastScanResult({ success: false, message: 'Failed to get GPS location' });
          setTimeout(() => {
            setLastScanResult(null);
            startScanner();
          }, 3000);
          return;
        }
      }

      const body = isEvent
        ? { eventId: selectedSessionId, qrCode: qrCodeText, latitude: lat, longitude: lon }
        : { sessionId: selectedSessionId, qrCode: qrCodeText, latitude: lat, longitude: lon };

      const res = await fetch('/api/attendance/leader-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setLastScanResult({ success: true, memberName: data.memberName });
        setScannedCount((prev) => prev + 1);
        toast.success(`Checked in ${data.memberName}`);
      } else {
        setLastScanResult({
          success: false,
          memberName: data.memberName,
          message: data.message || data.error,
        });
        toast.error(data.message || data.error);
      }
    } catch {
      setLastScanResult({ success: false, message: 'Connection failed' });
      toast.error('Connection failed');
    }

    setTimeout(() => {
      setLastScanResult(null);
      startScanner();
    }, 3000);
  };

  const handleStop = () => {
    stopScanner();
    setIsScanning(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF7F2] pb-24">
      <div className="sticky top-0 z-20 bg-[#FAF7F2]/95 backdrop-blur border-b border-[#E5D5C5]/60 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/profile" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[#1A202C] flex items-center gap-2">
            <LucideCamera className="w-5 h-5 text-[#8B2323]" />
            ePass Scanner
          </h1>
          <p className="text-xs text-[#7A6150]">Scan member ePasses for assigned sessions</p>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Card className="border-[#E5D5C5]/60 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSessions ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-[#7A6150]">
                You are not assigned to scan any active attendance sessions right now.
              </p>
            ) : (
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
                disabled={isScanning}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {!isScanning && sessions.length > 0 && (
              <Button
                className="w-full bg-[#8B2323] hover:bg-[#721515] h-12 text-base rounded-xl"
                onClick={startScanner}
              >
                <QrCode className="w-5 h-5 mr-2" /> Start Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {isScanning && (
          <Card className="overflow-hidden border-2 border-[#8B2323]/40 rounded-2xl">
            <CardContent className="p-0 relative">
              <div
                id="member-e-pass-scanner"
                className="w-full bg-black"
                style={{ minHeight: '350px' }}
              />

              {lastScanResult && (
                <div
                  className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center ${
                    lastScanResult.success ? 'bg-green-900/90' : 'bg-red-900/90'
                  }`}
                >
                  {lastScanResult.success ? (
                    <UserCheck className="w-16 h-16 text-green-400 mb-4" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-400 mb-4" />
                  )}
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {lastScanResult.success ? 'Checked In!' : 'Check-In Failed'}
                  </h2>
                  {lastScanResult.memberName && (
                    <p className="text-xl text-white/90 font-medium">{lastScanResult.memberName}</p>
                  )}
                  {!lastScanResult.success && lastScanResult.message && (
                    <p className="text-red-200 mt-2">{lastScanResult.message}</p>
                  )}
                  <div className="mt-6 text-white/50 text-sm">Resuming scanner automatically…</div>
                </div>
              )}

              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-20">
                <div className="bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded-full text-sm font-medium">
                  Scanned: {scannedCount}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="pointer-events-auto rounded-full"
                  onClick={handleStop}
                >
                  Stop
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {scannerError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3">
            <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{scannerError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EpassScanPage() {
  return (
    <AuthGate title="ePass Scanner" description="Sign in to scan member ePasses for your assigned sessions.">
      <EpassScanInner />
    </AuthGate>
  );
}
