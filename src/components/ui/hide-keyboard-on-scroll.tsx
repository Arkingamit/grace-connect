"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

const MOVE_PX = 12;

function isTextField(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const node = el as HTMLElement;
  const tag = (node.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || !!node.isContentEditable;
}

function hideKeyboard() {
  const active = document.activeElement;
  if (isTextField(active)) active.blur();
  if (Capacitor.isNativePlatform()) {
    Keyboard.hide().catch(() => undefined);
  }
}

function fieldCanScroll(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 4;
}

export function HideKeyboardOnScroll() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startedOnField = false;
    let hiddenThisGesture = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch?.clientX ?? 0;
      startY = touch?.clientY ?? 0;
      startedOnField = false;
      hiddenThisGesture = false;

      const active = document.activeElement;
      if (!isTextField(active)) return;
      const target = event.target as Node | null;
      startedOnField = !!target && (active === target || active.contains(target));
    };

    const onTouchMove = (event: TouchEvent) => {
      if (hiddenThisGesture) return;
      const active = document.activeElement;
      if (!isTextField(active)) return;

      const touch = event.touches[0];
      const dx = Math.abs((touch?.clientX ?? startX) - startX);
      const dy = Math.abs((touch?.clientY ?? startY) - startY);
      if (dx < MOVE_PX && dy < MOVE_PX) return;

      if (startedOnField && fieldCanScroll(active) && dy >= dx) return;
      if (startedOnField && dx > dy) return;

      hiddenThisGesture = true;
      hideKeyboard();
    };

    const opts: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener("touchstart", onTouchStart, opts);
    document.addEventListener("touchmove", onTouchMove, opts);
    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchmove", onTouchMove, true);
    };
  }, []);

  return null;
}
