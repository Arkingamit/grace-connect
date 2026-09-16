"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

function setKeyboardHeight(px: number) {
  const value = Math.max(0, Math.round(px));
  document.documentElement.style.setProperty("--keyboard-height", `${value}px`);
  document.documentElement.classList.toggle("keyboard-open", value > 80);
}

export function KeyboardInsets() {
  useEffect(() => {
    const fromViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(inset);
    };

    fromViewport();
    window.visualViewport?.addEventListener("resize", fromViewport);
    window.visualViewport?.addEventListener("scroll", fromViewport);

    let removeNative: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/keyboard").then(({ Keyboard }) => {
        const listeners = Promise.all([
          Keyboard.addListener("keyboardWillShow", (info) => {
            setKeyboardHeight(info.keyboardHeight);
            window.scrollTo(0, 0);
          }),
          Keyboard.addListener("keyboardDidShow", (info) => {
            setKeyboardHeight(info.keyboardHeight);
            window.scrollTo(0, 0);
          }),
          Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0)),
          Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0)),
        ]);
        listeners.then((handles) => {
          removeNative = () => handles.forEach((handle) => handle.remove());
        });
      });
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", fromViewport);
      window.visualViewport?.removeEventListener("scroll", fromViewport);
      removeNative?.();
      setKeyboardHeight(0);
    };
  }, []);

  return null;
}
