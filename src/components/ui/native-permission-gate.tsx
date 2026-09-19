"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { Bell, MapPin } from "lucide-react";

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied" | "limited";

const DISMISS_KEY = "grace-perm-dismissed";

function canAsk(status: PermissionState | string | undefined) {
  return status === "prompt" || status === "prompt-with-rationale";
}

function isGranted(status: PermissionState | string | undefined) {
  return status === "granted" || status === "limited";
}

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

async function openAppSettings() {
  await NativeSettings.open({
    optionAndroid: AndroidSettings.ApplicationDetails,
    optionIOS: IOSSettings.App,
  });
}

/**
 * Ask once for notification + location when the OS will still show its dialog.
 * If the user already granted (including approximate location), stay quiet.
 * If they denied, show a settings sheet once per session — not on every resume.
 */
export function NativePermissionGate() {
  const [missing, setMissing] = useState<{ notifications: boolean; location: boolean } | null>(
    null
  );
  const running = useRef(false);
  const askedOs = useRef(false);

  const ensure = useCallback(async (askOs: boolean) => {
    if (!Capacitor.isNativePlatform() || running.current) return;
    running.current = true;
    try {
      let push = await PushNotifications.checkPermissions();
      let loc = await Geolocation.checkPermissions();

      if (askOs && !askedOs.current) {
        askedOs.current = true;
        if (canAsk(push.receive)) {
          push = await PushNotifications.requestPermissions();
        }
        if (canAsk(loc.location) || canAsk(loc.coarseLocation)) {
          loc = await Geolocation.requestPermissions();
        }
      }

      const notificationsMissing = !isGranted(push.receive);
      const locationMissing = !isGranted(loc.location) && !isGranted(loc.coarseLocation);

      if (notificationsMissing || locationMissing) {
        if (!wasDismissed() && !canAsk(push.receive) && !canAsk(loc.location) && !canAsk(loc.coarseLocation)) {
          setMissing({ notifications: notificationsMissing, location: locationMissing });
        }
      } else {
        setMissing(null);
      }
    } catch (err) {
      console.warn("[NativePermissionGate] permission check failed", err);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const timer = window.setTimeout(() => {
      void ensure(true);
    }, 800);

    const sub = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void ensure(false);
    });

    return () => {
      window.clearTimeout(timer);
      void sub.then((handle) => handle.remove());
    };
  }, [ensure]);

  if (!missing) return null;

  const title =
    missing.notifications && missing.location
      ? "Turn on notifications and location"
      : missing.notifications
        ? "Turn on notifications"
        : "Turn on location";

  const body =
    missing.notifications && missing.location
      ? "Grace Connect needs notifications for church updates and location for attendance check-in. Enable both in Settings."
      : missing.notifications
        ? "Enable notifications in Settings so you don't miss church updates and events."
        : "Enable location in Settings so you can check in at church events.";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[10001] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#E5D5C5] bg-white p-5 shadow-xl">
        <div className="mb-3 flex gap-2">
          {missing.notifications && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBE8E8] text-[#8B2323]">
              <Bell className="h-5 w-5" />
            </div>
          )}
          {missing.location && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBE8E8] text-[#8B2323]">
              <MapPin className="h-5 w-5" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold text-[#1A202C]">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#7A6150]">{body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-xl bg-[#8B2323] px-4 py-3 text-sm font-semibold text-white"
            onClick={async () => {
              try {
                await openAppSettings();
              } catch (err) {
                console.warn("[NativePermissionGate] open settings failed", err);
              }
            }}
          >
            Open Settings
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#FAF7F2] px-4 py-3 text-sm font-medium text-[#7A6150]"
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {}
              setMissing(null);
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
