"use client";

import { useEffect } from "react";
import { captureReferralFromLocation } from "@/lib/referrals/attribution";

/**
 * Captures `?r=XXXXXX` on first paint and persists it to cookie + localStorage.
 * Mount once near the app root so landing and deep links both attribute.
 */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromLocation();
  }, []);

  return null;
}
