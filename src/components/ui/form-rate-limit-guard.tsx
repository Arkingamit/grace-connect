"use client";

import { useEffect } from "react";
import { installClientFormRateLimit } from "@/lib/client-form-rate-limit";

export function FormRateLimitGuard() {
  useEffect(() => installClientFormRateLimit(), []);
  return null;
}
