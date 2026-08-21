"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const COLORS = [
  "#8B2323",
  "#E8B923",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ec4899",
  "#a855f7",
  "#fde68a",
  "#ffffff",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

type Corner = "left" | "right";

function makeCornerRibbons(side: Corner, count: number) {
  const dir = side === "left" ? 1 : -1;
  return Array.from({ length: count }, (_, i) => {
    const longRibbon = Math.random() > 0.4;
    return {
      id: `${side}-${i}`,
      side,
      color: pick(COLORS),
      width: longRibbon ? rand(4, 10) : rand(6, 14),
      height: longRibbon ? rand(20, 48) : rand(8, 16),
      duration: rand(2.1, 4.4),
      startRot: rand(0, 360),
      spin: dir * rand(240, 1100),
      endX: dir * rand(48, 420) + rand(-60, 60),
    };
  });
}

/** Ribbons fall from the phone screen corners (not the dialog card). */
export function CelebrationRibbon({
  active,
  durationMs = 4800,
}: {
  active: boolean;
  durationMs?: number;
}) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [ribbons, setRibbons] = React.useState<ReturnType<typeof makeCornerRibbons>>([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!active) {
      setVisible(false);
      setRibbons([]);
      return;
    }
    setRibbons([
      ...makeCornerRibbons("left", 48),
      ...makeCornerRibbons("right", 48),
    ]);
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(hide);
  }, [active, durationMs]);

  if (!mounted || !visible || ribbons.length === 0) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100dvw",
        height: "100dvh",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ribbon-gravity-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--start-rot));
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--end-x), 120dvh, 0) rotate(calc(var(--start-rot) + var(--spin)));
            opacity: 0;
          }
        }
      `}</style>

      {ribbons.map((r) => (
        <span
          key={r.id}
          style={{
            position: "fixed",
            top: "env(safe-area-inset-top, 0px)",
            left: r.side === "left" ? 0 : "auto",
            right: r.side === "right" ? 0 : "auto",
            width: r.width,
            height: r.height,
            backgroundColor: r.color,
            borderRadius: 1,
            ["--start-rot" as string]: `${r.startRot}deg`,
            ["--spin" as string]: `${r.spin}deg`,
            ["--end-x" as string]: `${r.endX}px`,
            animation: `ribbon-gravity-fall ${r.duration}s linear forwards`,
          }}
        />
      ))}
    </div>,
    document.body
  );
}
