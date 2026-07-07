"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as LucideCamera, QrCode, UserCheck, XCircle, Loader2, RefreshCw } from 'lucide-react';
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

export default function LeaderScannerPage() {
  const { currentUser } = useAdminData();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; memberName?: string; message?: string } | null>(null);
  
  const scannerRef = useRef<any>(null);
  
  // Fetch active sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/attendance/active');
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
          if (data.length > 0) {
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
        if (state === 2) { // 2 = SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const processScan = async (qrCodeText: string) => {
    if (!selectedSessionId) return;
    
    // Pause scanner briefly to show result
    await stopScanner();
    
    try {
      const selectedSession = sessions.find(s => s._id === selectedSessionId);
      const isEvent = selectedSession?.type === 'event';
      const requireGps = isEvent ? false : (selectedSession?.checkInConfig?.scannerRequireGps ?? false);
      
      let lat = 0;
      let lon = 0;

      if (requireGps) {
        if (Capacitor.isNativePlatform()) {
          try {
            await Geolocation.requestPermissions();
          } catch (e) {
            console.warn("Native location permission request failed", e);
          }
        }
        if (!navigator.geolocation) {
          toast.error("Geolocation is not supported by your browser");
          setLastScanResult({ success: false, message: 'GPS required but not supported' });
          setTimeout(() => { setLastScanResult(null); startScanner(); }, 3000);
          return;
        }

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true, timeout: 5000, maximumAge: 0 
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch (err) {
          toast.error("Failed to get your location. GPS is required for this session.");
          setLastScanResult({ success: false, message: 'Failed to get GPS location' });
          setTimeout(() => { setLastScanResult(null); startScanner(); }, 3000);
          return;
        }
      }

      const body = isEvent 
        ? { eventId: selectedSessionId, qrCode: qrCodeText, latitude: lat, longitude: lon }
        : { sessionId: selectedSessionId, qrCode: qrCodeText, latitude: lat, longitude: lon };
        
      const res = await fetch('/api/attendance/leader-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setLastScanResult({ success: true, memberName: data.memberName });
        setScannedCount(prev => prev + 1);
        toast.success(`Checked in ${data.memberName}`);
      } else {
        setLastScanResult({ success: false, memberName: data.memberName, message: data.message || data.error });
        toast.error(data.message || data.error);
      }
    } catch (e) {
      setLastScanResult({ success: false, message: 'Connection failed' });
      toast.error('Connection failed');
    }
    
    // Auto resume scanner after 3 seconds
    setTimeout(() => {
      setLastScanResult(null);
      startScanner();
    }, 3000);
  };

  const startScanner = async () => {
    if (!selectedSessionId) {
      toast.error("Please select a session first");
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
        } catch (e) {
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

      const scannerId = 'e-pass-scanner';
      const html5QrCode = new window.Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // Found QR Code
          processScan(decodedText);
        },
        () => {
          // No QR Code detected in this frame
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      setScannerError('Could not start camera. Make sure permissions are enabled.');
      toast.error('Failed to start camera');
    }
  };

  const handleStop = () => {
    stopScanner();
    setIsScanning(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LucideCamera className="w-8 h-8 text-primary" />
          ePass Scanner
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan member ePass QR codes to quickly mark their attendance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSessions ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-red-500 font-medium">There are no active attendance sessions right now.</p>
          ) : (
            <Select 
              value={selectedSessionId} 
              onValueChange={setSelectedSessionId}
              disabled={isScanning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s._id} value={s._id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isScanning && sessions.length > 0 && (
            <Button 
              className="w-full bg-[#8B2323] hover:bg-[#721515] h-12 text-lg"
              onClick={startScanner}
            >
              <QrCode className="w-5 h-5 mr-2" /> Start Scanner
            </Button>
          )}
        </CardContent>
      </Card>

      {isScanning && (
        <Card className="overflow-hidden border-2 border-primary/50">
          <CardContent className="p-0 relative">
            <div id="e-pass-scanner" className="w-full bg-black" style={{ minHeight: '350px' }}></div>
            
            {/* Overlay for Last Scan Result */}
            {lastScanResult && (
              <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300 ${lastScanResult.success ? 'bg-green-900/90' : 'bg-red-900/90'}`}>
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
                
                <div className="mt-6 text-white/50 text-sm">Resuming scanner automatically...</div>
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
  );
}
