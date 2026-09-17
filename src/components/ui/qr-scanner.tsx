"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminData } from '@/lib/admin-data-context';
import { Camera as LucideCamera, X, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

/**
 * QR Scanner component that uses the device camera to scan campus QR codes.
 * Loads html5-qrcode from CDN — zero npm dependencies.
 */

// Declare global type for the CDN-loaded library
declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface QRScannerProps {
  onClose: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const router = useRouter();
  const { campuses } = useAdminData();
  const scannerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannedCampus, setScannedCampus] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        // State 2 = SCANNING
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

  // Extract campusId from a scanned URL
  const extractCampusId = useCallback((text: string): string | null => {
    try {
      // Try to parse as URL
      const url = new URL(text);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const registerIdx = pathParts.indexOf('register');
      if (registerIdx !== -1 && pathParts.length > registerIdx + 1) {
        return decodeURIComponent(pathParts[registerIdx + 1]).toLowerCase().trim();
      }
    } catch {
      // Not a URL — maybe just a campus ID
    }
    const campus = campuses.find(c => c.id.toLowerCase().trim() === text.toLowerCase().trim());
    if (campus) return campus.id;
    return null;
  }, [campuses]);

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
        try {
          await Camera.requestPermissions({ permissions: ['camera'] });
        } catch (e) {
          console.warn("Native camera permission request failed", e);
        }
      }

      if (!mounted) return;

      // Create scanner instance
      const scannerId = 'qr-reader';
      const html5QrCode = new window.Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // On successful scan
            const extractedId = extractCampusId(decodedText);
            if (extractedId) {
              const campus = campuses.find(c => c.id.toLowerCase().trim() === extractedId.toLowerCase().trim());
              if (campus) {
                setScannedCampus(campus.name);
                // Stop scanning and navigate
                html5QrCode.stop().then(() => {
                  scannerRef.current = null;
                  router.push(`/login`);
                }).catch(() => {
                  router.push(`/login`);
                });
              } else {
                html5QrCode.stop().then(() => {
                  scannerRef.current = null;
                  setError(`Campus not found. Scanned ID: "${extractedId}". Available campuses: ${campuses.length}. IDs: ${campuses.map(c => c.id).join(', ')}`);
                }).catch(() => {
                  setError(`Campus not found. Scanned ID: "${extractedId}". Available campuses: ${campuses.length}. IDs: ${campuses.map(c => c.id).join(', ')}`);
                });
              }
            } else {
              html5QrCode.stop().then(() => {
                scannerRef.current = null;
                setError(`Invalid QR format. Scanned text: "${decodedText}"`);
              }).catch(() => {
                setError(`Invalid QR format. Scanned text: "${decodedText}"`);
              });
            }
          },
          () => {
            // QR code not detected — silent, keep scanning
          }
        );
        if (mounted) setIsLoading(false);
      } catch (err: any) {
        if (mounted) {
          if (err?.message?.includes?.('NotAllowedError') || err?.name === 'NotAllowedError') {
            setError('Camera access denied. Please allow camera permission and try again.');
          } else {
            setError('Could not start camera. Make sure your device has a camera and camera permissions are enabled.');
          }
          setIsLoading(false);
        }
      }
    };

    loadAndStart().catch(err => {
      if (mounted) {
        setError(err.message || 'Failed to initialize scanner');
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [campuses, extractCampusId, router, stopScanner, retryKey]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Scan Campus QR Code</h2>
        <p className="text-white/60 text-sm mt-1">
          Point your camera at a campus QR code to register
        </p>
      </div>

      {/* Scanner Container */}
      <div className="w-full max-w-sm relative">
        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 rounded-2xl">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-white/70 text-sm">Starting camera...</p>
          </div>
        )}

        {/* Success overlay */}
        {scannedCampus && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-900/80 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-emerald-100 font-semibold">Campus Found!</p>
            <p className="text-emerald-200/70 text-sm mt-1">Redirecting to {scannedCampus}...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 p-6 rounded-2xl border border-destructive/20 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-semibold mb-1">Scan Failed</p>
            <p className="text-white/80 text-xs mb-4 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                onClick={async () => {
                  try {
                    if (Capacitor.isNativePlatform()) {
                      try {
                        const status = await Camera.requestPermissions({ permissions: ['camera'] });
                        if (status.camera === 'denied') {
                          throw new Error('denied');
                        }
                      } catch (err) {
                        // User permanently denied or plugin threw error
                        if (Capacitor.getPlatform() === 'ios') {
                          await NativeSettings.openIOS({ option: IOSSettings.App });
                        } else {
                          await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
                        }
                        return; // Stop trying to load
                      }
                    } else {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                      stream.getTracks().forEach(t => t.stop());
                    }
                    setError(null);
                    setIsLoading(true);
                    setRetryKey(k => k + 1);
                  } catch (err: any) {
                    setError('Permission denied again. Please enable it in your settings.');
                  }
                }}
              >
                Enable Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-white border-white/20 hover:bg-white/10"
                onClick={handleClose}
              >
                Close Scanner
              </Button>
            </div>
          </div>
        )}

        {/* QR Reader Element */}
        <div
          id="qr-reader"
          className="rounded-2xl overflow-hidden bg-muted/20"
          style={{ minHeight: 300 }}
        />
      </div>


      {/* Hint */}
      {!error && !scannedCampus && (
        <p className="text-white/40 text-xs mt-6 text-center max-w-xs">
          Ask your campus pastor for the QR code, or select your campus manually on the registration page.
        </p>
      )}
    </div>
  );
}
