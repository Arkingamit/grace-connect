"use client";

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ForceUpdate } from './force-update';
import { APP_VERSION } from '@/lib/version';

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function resolveMinVersion(settings: any, platform: string): string {
  if (platform === 'android') {
    return settings.minAppVersionAndroid || settings.minAppVersion || '0.1.0';
  }
  if (platform === 'ios') {
    return settings.minAppVersionIos || settings.minAppVersion || '0.1.0';
  }
  // Web / unknown: use the stricter of the two platform mins when available
  const android = settings.minAppVersionAndroid || settings.minAppVersion || '0.1.0';
  const ios = settings.minAppVersionIos || settings.minAppVersion || '0.1.0';
  return compareVersions(android, ios) >= 0 ? android : ios;
}

function resolveStoreUrl(settings: any, platform: string): string {
  if (platform === 'android') return settings.androidStoreUrl || '';
  if (platform === 'ios') return settings.iosStoreUrl || '';
  return settings.androidStoreUrl || settings.iosStoreUrl || '';
}

export function VersionGate({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeUrl, setStoreUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/system/settings');
        if (res.ok) {
          const settings = await res.json();
          const platform = Capacitor.isNativePlatform()
            ? Capacitor.getPlatform()
            : 'web';
          const minVersion = resolveMinVersion(settings, platform);

          if (minVersion && compareVersions(APP_VERSION, minVersion) < 0) {
            setNeedsUpdate(true);
            setStoreUrl(resolveStoreUrl(settings, platform));
            setMessage(
              settings.forceUpdateMessage ||
                'A critical update is required to continue using Grace Connect. Please update to the latest version.'
            );
          }
        }
      } catch (error) {
        console.error('Failed to check app version:', error);
      } finally {
        setLoading(false);
      }
    };

    checkVersion();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (needsUpdate) {
    return <ForceUpdate storeUrl={storeUrl} message={message} />;
  }

  return <>{children}</>;
}
