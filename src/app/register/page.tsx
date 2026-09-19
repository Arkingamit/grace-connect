"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { campusRegisterPath, readCampusInvite } from "@/lib/campus-invite";

/**
 * Bare /register: reuse a campus already captured from a QR, otherwise login.
 */
export default function RegisterEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const campusId = readCampusInvite();
    router.replace(campusId ? campusRegisterPath(campusId) : "/login");
  }, [router]);

  return null;
}
