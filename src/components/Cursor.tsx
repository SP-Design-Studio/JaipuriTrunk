"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * The pointer is one small circle that changes shape. It follows the mouse with a
 * slight, soft lag and has four states, set as attributes on the layer and drawn by
 * CSS (see `.cur` in globals.css):
 *
 *  - rest:   a small solid circle, maroon on the cream pages, cream on the maroon ones;
 *  - hit:    over anything clickable it opens into a larger ring with a faint orange wash;
 *  - press:  it tightens while the button is down;
 *  - text:   over a text field it becomes a thin vertical bar, like a caret.
 *
 * It replaces the system cursor everywhere (the `cursor-none` class on <html>), so the
 * site never shows two pointers.
 *
 * Only fine pointers get it (a phone or tablet never sees it), and with reduced
 * motion it stops lagging.
 */

/** Things you can click. */
const HIT = "a, button, summary, [role='button'], [data-cursor-hit]";
/** Things you can type into. */
const TEXT = "input, textarea, select, [contenteditable='true']";

export default function Cursor() {
  const layer = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const L = layer.current;
    const M = mark.current;
    if (!L || !M) return;

    // The layer lives in the browser's top layer, so it can be raised above a modal
    // dialog (the gallery), which z-index alone cannot do.
    try {
      L.showPopover?.();
    } catch {
      /* already open, or no popover support: the fixed layer still works */
    }

    // Touch devices never see this: there is no pointer to follow.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const wide = window.matchMedia("(min-width: 768px)");

    const markX = gsap.quickTo(M, "x", {
      duration: reduce ? 0 : 0.18,
      ease: "power3.out",
    });
    const markY = gsap.quickTo(M, "y", {
      duration: reduce ? 0 : 0.18,
      ease: "power3.out",
    });

    let shown = false;
    // The native pointer is hidden only while ours is genuinely on screen. Tracked
    // live, because a window can be dragged across the breakpoint.
    const sync = () =>
      document.documentElement.classList.toggle(
        "cursor-none",
        shown && wide.matches,
      );
    wide.addEventListener("change", sync);

    const move = (e: PointerEvent) => {
      if (!shown) {
        // Start where the pointer is, or it flies in from the corner.
        gsap.set(M, { x: e.clientX, y: e.clientY });
        shown = true;
        L.setAttribute("data-on", "");
        sync();
      }
      markX(e.clientX);
      markY(e.clientY);
    };

    const over = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el) return;
      const text = Boolean(el.closest(TEXT));
      L.toggleAttribute("data-text", text);
      L.toggleAttribute("data-hit", !text && Boolean(el.closest(HIT)));
      // Sections opt in by attribute: the maroon ones carry data-cursor-invert.
      L.dataset.tone = el.closest("[data-cursor-invert]") ? "dark" : "light";
    };

    const down = () => L.setAttribute("data-press", "");
    const up = () => L.removeAttribute("data-press");
    const leave = () => {
      shown = false;
      L.removeAttribute("data-on");
      L.removeAttribute("data-press");
      sync();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("mouseleave", leave);
    return () => {
      document.documentElement.classList.remove("cursor-none");
      wide.removeEventListener("change", sync);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      ref={layer}
      id="cursor-layer"
      popover="manual"
      aria-hidden="true"
      className="cur pointer-events-none fixed inset-0 z-[999] m-0 hidden h-screen w-screen overflow-visible border-0 bg-transparent p-0 md:block"
    >
      <div ref={mark} className="absolute top-0 left-0">
        <div className="cur-mark" />
      </div>
    </div>
  );
}
