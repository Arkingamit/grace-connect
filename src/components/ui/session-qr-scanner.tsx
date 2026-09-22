"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera as LucideCamera, X, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { ensureCameraPermission } from '@/lib/native-camera';
import { QrGalleryButton } from '@/components/ui/qr-gallery-button';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface SessionQRScannerProps {
  onClose: () => void;
}

export function SessionQRScanner({ onClose }: SessionQRScannerProps) {
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'permission' | 'scan' | 'init' | null>(null);
  const [scannedSession, setScannedSession] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState(0);

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

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  const extractSessionId = useCallback((text: string): string | null => {
    try {
      const url = new URL(text);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Expected: /check-in/qr/<sessionId>
      if (pathParts.length >= 3 && pathParts[0] === 'check-in' && pathParts[1] === 'qr') {
        return pathParts[2];
      }
    } catch {
      // not a url
    }
    return null;
  }, []);

  const applyDecoded = useCallback((decodedText: string) => {
    const sessionId = extractSessionId(decodedText);
    if (sessionId) {
      setError(null);
      setErrorKind(null);
      setScannedSession(true);
      stopScanner().then(() => {
        router.push(`/check-in/qr/${sessionId}`);
      });
    } else {
      setErrorKind('scan');
      setError('Invalid QR code. Please scan a valid session QR code.');
    }
  }, [extractSessionId, router, stopScanner]);

  useEffect(() => {
    let mounted = true;

    const loadAndStart = async () => {
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
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          if (mounted) {
            setErrorKind('permission');
            setError('Camera is off. Enable it in Settings, then scan again.');
            setIsLoading(false);
          }
          return;
        }
      }

      if (!mounted) return;

      const scannerId = 'session-qr-reader';
      const html5QrCode = new window.Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            applyDecoded(decodedText);
          },
          () => {}
        );
        if (mounted) setIsLoading(false);
      } catch (err: any) {
        if (mounted) {
          setErrorKind('permission');
          if (err?.message?.includes?.('NotAllowedError') || err?.name === 'NotAllowedError') {
            setError('Camera is off. Enable it in Settings, then scan again.');
          } else {
            setError('Could not start the camera. Enable camera permission and try again.');
          }
          setIsLoading(false);
        }
      }
    };

    loadAndStart().catch(err => {
      if (mounted) {
        setErrorKind('init');
        setError(err.message || 'Failed to initialize scanner');
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [applyDecoded, stopScanner, retryKey]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#8B2323] flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Scan Session QR</h2>
        <p className="text-white/60 text-sm mt-1">
          Point your camera at the screen, or upload a photo
        </p>
      </div>

      <div className="w-full max-w-sm relative">
        {isLoading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 rounded-2xl">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-white/70 text-sm">Starting camera...</p>
          </div>
        )}

        {scannedSession && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-green-900/80 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
              <QrCode className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-green-100 font-semibold">QR Code Found!</p>
            <p className="text-green-200/70 text-sm mt-1">Checking in...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 p-6 rounded-2xl border border-red-500/20 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-500 font-semibold mb-1">Scan Failed</p>
            <p className="text-white/80 text-xs mb-4 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              {errorKind === 'permission' ? (
                <Button
                  size="sm"
                  className="w-full bg-[#8B2323] hover:bg-[#721515] text-white font-medium"
                  onClick={async () => {
                    const allowed = await ensureCameraPermission();
                    if (!allowed && Capacitor.isNativePlatform()) {
                      try {
                        if (Capacitor.getPlatform() === 'ios') {
                          await NativeSettings.openIOS({ option: IOSSettings.App });
                        } else {
                          await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
                        }
                      } catch {
                        // ignore
                      }
                      return;
                    }
                    setError(null);
                    setErrorKind(null);
                    setIsLoading(true);
                    setRetryKey((k) => k + 1);
                  }}
                >
                  Enable Camera
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-[#8B2323] hover:bg-[#721515] text-white font-medium"
                  onClick={() => {
                    setError(null);
                    setErrorKind(null);
                    setIsLoading(true);
                    setRetryKey((k) => k + 1);
                  }}
                >
                  Scan again
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-white border-white/20 hover:bg-white/10"
                onClick={handleClose}
              >
                Close Scanner
              </Button>
              <QrGalleryButton
                className="w-full"
                beforePick={stopScanner}
                onDecoded={applyDecoded}
              />
            </div>
          </div>
        )}

        <div
          id="session-qr-reader"
          className="rounded-2xl overflow-hidden bg-white/10"
          style={{ minHeight: 300 }}
        />
      </div>

      {!error && !scannedSession && (
        <div className="mt-6">
          <QrGalleryButton beforePick={stopScanner} onDecoded={applyDecoded} />
        </div>
      )}
    </div>
  );
}
