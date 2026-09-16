"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /register now redirects to the unified login page.
 * Registration starts with OAuth verification at /login; the QR scanner
 * is shown after the identity is verified (for new users).
 */
export default function RegisterEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
