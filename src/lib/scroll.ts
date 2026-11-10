import type Lenis from "lenis";

declare global {
  interface Window {
    /** Set by SmoothScroll so anchors can glide instead of jumping. */
    __lenis?: Lenis;
  }
}

/** Scrolls to an element by id: smoothly with Lenis, natively without it. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: "smooth" });
}
