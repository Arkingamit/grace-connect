"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Calendar, Megaphone, BookOpen, Heart, Music, FileText, X, Radio } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  new_event: Calendar,
  new_announcement: Megaphone,
  new_note: FileText,
  new_prayer: Heart,
  new_sermon: BookOpen,
  new_worship_video: Music,
  recurring_announcement: Megaphone,
  event_reminder: Calendar,
  system: Bell,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string }> = {
  new_event: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  new_announcement: { bg: 'bg-[#FBE8E8]', icon: 'text-[#8B2323]', border: 'border-[#E5B5B5]' },
  new_note: { bg: 'bg-amber-50', icon: 'text-amber-700', border: 'border-amber-200' },
  new_prayer: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
  new_sermon: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  new_worship_video: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  recurring_announcement: { bg: 'bg-[#FBE8E8]', icon: 'text-[#8B2323]', border: 'border-[#E5B5B5]' },
  event_reminder: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  system: { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-200' },
};

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const lastPollRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swRegistered = useRef(false);

  const registerPush = useCallback(async (userInitiated = false) => {
    if (swRegistered.current) return;
    if (typeof window === 'undefined') return;

    try {
      // 1. Native Capacitor App (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt' && !userInitiated) {
          setShowPermissionPrompt(true);
          return;
        }

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') return;

        // Register with Apple / Google to receive tokens
        await PushNotifications.register();

        // On success, we should be able to receive tokens
        PushNotifications.addListener('registration', async (token) => {
          console.log('[Native Push] Push registration success, token:', token.value);
          // Send native FCM token to our server
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              platform: Capacitor.getPlatform(), // 'android' or 'ios'
              fcmToken: token.value 
            }),
          });
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Native Push] Error on registration:', JSON.stringify(error));
        });

        // Add listener for native push notification action clicks
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          const url = notification.notification.data?.url;
          if (url) {
            window.location.href = url;
          }
        });

        swRegistered.current = true;
        return;
      }

      // 2. Web App (Service Worker + Web Push)
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistered.current = true;

      // Wait for the service worker to be active
      const sw = registration.installing || registration.waiting || registration.active;
      if (sw && sw.state !== 'activated') {
        await new Promise<void>((resolve) => {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
        });
      }

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        if (Notification.permission === 'default' && !userInitiated) {
          setShowPermissionPrompt(true);
          return;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Fetch the VAPID public key
        const vapidRes = await fetch('/api/push/vapid');
        if (!vapidRes.ok) return;
        const { publicKey } = await vapidRes.json();

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });
      }

      // Send subscription to the server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    } catch (err) {
      console.error('[NotificationProvider] Push registration failed:', err);
    }
  }, []);

  // ── Poll for new notifications & show floating toasts ──
  const pollNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const notifications: any[] = await res.json();
      if (!notifications.length) return;

      // On first poll, just record the latest timestamp — don't show toasts
      const latestCreatedAt = notifications[0]?.createdAt;
      if (!lastPollRef.current) {
        lastPollRef.current = latestCreatedAt;
        return;
      }

      // Find notifications newer than our last-seen timestamp
      const newOnes = notifications.filter(
        (n: any) => new Date(n.createdAt) > new Date(lastPollRef.current!)
      );

      if (newOnes.length > 0) {
        lastPollRef.current = latestCreatedAt;

        // Add to toast stack (max 3 visible at once)
        const toastsToAdd: NotificationToast[] = newOnes.slice(0, 3).map((n: any) => ({
          id: n._id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt,
        }));

        setToasts((prev) => [...toastsToAdd, ...prev].slice(0, 5));

        // Auto-dismiss after 6 seconds
        toastsToAdd.forEach((t) => {
          setTimeout(() => {
            setToasts((prev) => prev.filter((p) => p.id !== t.id));
          }, 6000);
        });
      }
    } catch {
      // Silently fail — polling is best-effort
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Lifecycle ──
  useEffect(() => {
    if (!session) return;

    // Register push after login
    registerPush();

    // Start polling every 30 seconds
    pollNotifications();
    pollIntervalRef.current = setInterval(pollNotifications, 30_000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, registerPush, pollNotifications]);

  return (
    <>
      {children}

      {/* ── Permission Prompt Banner ── */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-[10000] p-4 bg-white shadow-md border-b border-[#E5D5C5] flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#1A202C]">Stay Updated</p>
                <p className="text-xs text-[#7A6150]">Enable push notifications so you don't miss important church updates and events.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium text-[#7A6150] bg-[#FAF7F2] hover:bg-[#F2EAE0] transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  setShowPermissionPrompt(false);
                  registerPush(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#8B2323] hover:bg-[#721c1c] transition-colors"
              >
                Enable
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Toast Stack ── */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: 'min(400px, calc(100vw - 2rem))' }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const Icon = ICON_MAP[toast.type] || Bell;
            const colors = COLOR_MAP[toast.type] || COLOR_MAP.system;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto rounded-2xl border ${colors.border} ${colors.bg} p-4 shadow-xl backdrop-blur-sm flex items-start gap-3 cursor-pointer`}
                onClick={() => dismissToast(toast.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1A202C] truncate">{toast.title}</p>
                  <p className="text-xs text-[#7A6150] mt-0.5 line-clamp-2">{toast.message}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  className="shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#7A6150]/60" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
