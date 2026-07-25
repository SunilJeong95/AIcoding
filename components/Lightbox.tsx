"use client";

import { useEffect } from "react";

interface LightboxProps {
  src: string;
  onClose: () => void;
}

// Full-screen image viewer — click the backdrop, the ✕, or Escape to close.
export default function Lightbox({ src, onClose }: LightboxProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        // Stop here so a Lightbox nested inside another click-to-close
        // overlay (e.g. a modal) only dismisses itself, not its ancestor too.
        e.stopPropagation();
        onClose();
      }}
    >
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg text-white transition hover:bg-black/70"
      >
        ✕
      </button>
    </div>
  );
}
