"use client";

import React, { useEffect, useState } from 'react';
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

export function VersionGate({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/system/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings?.minAppVersion) {
            // Compare local APP_VERSION against minAppVersion from server
            if (compareVersions(APP_VERSION, settings.minAppVersion) < 0) {
              setNeedsUpdate(true);
            }
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
    // Return empty or a loading spinner to prevent flicker of content
    return <div className="min-h-screen bg-background" />;
  }

  if (needsUpdate) {
    return <ForceUpdate />;
  }

  return <>{children}</>;
}
