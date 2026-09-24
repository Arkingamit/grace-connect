"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, MapPin, CheckCircle2, XCircle, Loader2, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SessionQRScanner } from "@/components/ui/session-qr-scanner";
import { AuthGate } from "@/components/ui/auth-gate";
import { useNavigationHistory } from "@/components/ui/navigation-history-provider";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export default function CheckInPage() {
  const { goBack } = useNavigationHistory();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetch("/api/attendance/active")
      .then((res) => res.json())
      .then((data) => {
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
          const res = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: session._id,
              type: session.type || "session",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          const data = await res.json();

          if (res.ok) {
            setStatus((prev) => ({ ...prev, [session._id]: { success: true, message: "Successfully checked in!" } }));
            toast.success("Checked in successfully!");
          } else {
            setStatus((prev) => ({ ...prev, [session._id]: { success: false, message: data.message || data.error } }));
            toast.error(data.message || data.error);
          }
        } catch (e) {
          toast.error("Failed to connect to server");
          setStatus((prev) => ({ ...prev, [session._id]: { success: false, message: "Connection failed" } }));
        }
        setCheckingIn(null);
      },
      (error) => {
        setCheckingIn(null);
        let msg = "Failed to get location.";
        if (error.code === 1) msg = "Location permission denied. Please enable GPS.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27]">
      <div className="container mx-auto px-4 sm:px-6 page-back-offset pb-2">
        <div className="page-back-bar mb-2">
          <Button
            onClick={() => goBack("/")}
            variant="ghost"
            className="pl-3 pr-5 h-10 gap-2 bg-[#EDE0E0]/40 backdrop-blur-xl hover:bg-[#EDE0E0]/60 border border-white/50 rounded-full text-gray-900 hover:text-gray-900 transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-normal">Check-In</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6">
        <AuthGate title="Check-In" showBack={false}>
          <div className="max-w-4xl mx-auto space-y-4 py-6 sm:py-8">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#8B2323]" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl border border-[#E5D5C5]/60 bg-white/70 px-6 py-12 text-center shadow-sm">
                <MapPin className="mx-auto mb-4 h-12 w-12 text-[#E5D5C5]" />
                <h3 className="mb-2 text-lg font-bold text-[#1A202C]">No Active Sessions</h3>
                <p className="text-sm text-[#7A6150]">
                  There are no attendance sessions currently active for your campus.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  className="h-12 w-full rounded-xl border border-[#E5D5C5]/60 bg-white text-base font-bold text-[#8B2323] shadow-sm hover:bg-[#FAF7F2]"
                  onClick={() => setShowScanner(true)}
                >
                  <QrCode className="mr-2 h-5 w-5" />
                  Scan QR Code to Check-In
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#E5D5C5]/70" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#FAF7F2] px-2 text-[#7A6150]">Or use GPS</span>
                  </div>
                </div>

                {sessions.map((s) => {
                  const sessionStatus = status[s._id];
                  return (
                    <Card
                      key={s._id}
                      className="flex flex-col gap-4 rounded-2xl border border-[#E5D5C5]/60 bg-white/90 p-5 shadow-sm"
                    >
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[#1A202C]">{s.title}</h3>
                        <p className="text-sm text-[#7A6150]">
                          {s.startTime} - {s.endTime}
                        </p>
                      </div>

                      {sessionStatus ? (
                        <div
                          className={`flex items-start gap-3 rounded-xl p-4 ${
                            sessionStatus.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                          }`}
                        >
                          {sessionStatus.success ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          ) : (
                            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                          )}
                          <p className="text-sm font-medium leading-tight">{sessionStatus.message}</p>
                        </div>
                      ) : (
                        <Button
                          className="h-12 w-full rounded-xl bg-[#8B2323] text-base font-bold text-white hover:bg-[#721515]"
                          onClick={() => handleCheckIn(s)}
                          disabled={checkingIn === s._id}
                        >
                          {checkingIn === s._id ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying Location...
                            </>
                          ) : (
                            <>
                              <MapPin className="mr-2 h-5 w-5" /> Mark Attendance
                            </>
                          )}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </AuthGate>
      </div>

      {showScanner && <SessionQRScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}
