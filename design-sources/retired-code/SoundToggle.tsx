"use client";

import { useEffect, useRef, useState } from "react";

/** Ambient bazaar loop. Silent until the visitor opts in — never autoplays. */
export default function SoundToggle() {
  const el = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const a = el.current;
    if (!a) return;
    a.volume = 0;
    const fail = () => setAvailable(false);
    a.addEventListener("error", fail);
    return () => a.removeEventListener("error", fail);
  }, []);

  const toggle = async () => {
    const a = el.current;
    if (!a) return;
    if (on) {
      a.pause();
      setOn(false);
      return;
    }
    try {
      await a.play();
      setOn(true);
      // Gentle fade-in rather than a jolt
      const start = performance.now();
      const ramp = (t: number) => {
        const k = Math.min(1, (t - start) / 1200);
        a.volume = k * 0.35;
        if (k < 1) requestAnimationFrame(ramp);
      };
      requestAnimationFrame(ramp);
    } catch {
      setAvailable(false);
    }
  };

  if (!available) return null;

  return (
    <>
      <audio ref={el} src="/audio/bazaar-ambience.mp3" loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Mute ambience" : "Play bazaar ambience"}
        className="fixed right-6 bottom-6 z-[500] flex items-center gap-2 rounded-full border border-maroon/25 bg-cream/70 px-4 py-2 backdrop-blur-sm transition-colors hover:border-maroon/60"
      >
        <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[2px] bg-maroon"
              style={{
                height: on ? "100%" : "28%",
                animation: on ? `eq 900ms ${i * 140}ms ease-in-out infinite alternate` : "none",
              }}
            />
          ))}
        </span>
        <span className="text-maroon/80 text-[0.58rem] tracking-[0.25em] uppercase">
          {on ? "Sound on" : "Sound"}
        </span>
        <style>{`@keyframes eq{from{height:22%}to{height:100%}}`}</style>
      </button>
    </>
  );
}
