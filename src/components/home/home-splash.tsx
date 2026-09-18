"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const SESSION_KEY = "splashShown";
/** Keep the brand on screen long enough to feel intentional, not a flicker. */
const MIN_VISIBLE_MS = 1700;
/** Never trap the user behind the splash if data is slow. */
const MAX_VISIBLE_MS = 5000;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function shouldShowSplash() {
  if (typeof window === "undefined") return true;
  try {
    return !sessionStorage.getItem(SESSION_KEY);
  } catch {
    return true;
  }
}

/**
 * Full-screen brand splash for the first home load of a session.
 * Stays up while `ready` is false (data loading) and for at least MIN_VISIBLE_MS,
 * then crossfades into the page.
 */
export function HomeSplash({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(shouldShowSplash);
  const [minElapsed, setMinElapsed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {}
    const min = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    const max = window.setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(max);
    };
  }, [visible]);

  useEffect(() => {
    if (visible && ready && minElapsed) setVisible(false);
  }, [visible, ready, minElapsed]);

  useEffect(() => {
    if (!visible) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [visible]);

  const logoVisible = logoLoaded || reduceMotion;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="home-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#FAF7F2]"
          aria-label="Loading Grace Connect"
          role="status"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage: "var(--bg-pattern)",
              backgroundRepeat: "repeat",
              backgroundSize: "240px 240px",
            }}
            aria-hidden
          />

          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(139,35,35,0.14), rgba(245,158,11,0.08) 55%, rgba(250,247,242,0) 100%)",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: logoVisible ? 1 : 0, scale: logoVisible ? 1 : 0.7 }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
            aria-hidden
          />

          <motion.div
            className="relative flex flex-col items-center px-10"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.94 }}
            animate={
              logoVisible
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 14, scale: 0.94 }
            }
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 1.03 }}
            transition={{ duration: 0.75, ease: EASE_OUT }}
          >
            <motion.img
              src="/logo2.png"
              alt="Grace Ahmedabad"
              width={2275}
              height={1280}
              draggable={false}
              decoding="async"
              onLoad={() => setLogoLoaded(true)}
              onError={() => setLogoLoaded(true)}
              className="h-auto w-[min(72vw,340px)] select-none object-contain"
              animate={
                logoVisible && !reduceMotion
                  ? { scale: [1, 1.015, 1] }
                  : undefined
              }
              transition={{
                delay: 0.9,
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.p
              className="mt-5 font-serif text-[15px] italic tracking-wide text-[#7A6150]"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={logoVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: 0.6, delay: 0.35, ease: EASE_OUT }}
            >
              Where hearts unite
            </motion.p>

            <motion.div
              className="mt-8 h-[3px] w-24 overflow-hidden rounded-full bg-[#8B2323]/12"
              initial={{ opacity: 0 }}
              animate={{ opacity: logoVisible ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              aria-hidden
            >
              <motion.div
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#8B2323] via-[#B5442A] to-[#F59E0B]"
                animate={reduceMotion ? undefined : { x: ["-100%", "200%"] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
