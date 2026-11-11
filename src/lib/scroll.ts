import type Lenis from "lenis";

declare global {
  interface Window {
    /** Set by SmoothScroll so in-page links can glide instead of jumping. */
    __lenis?: Lenis;
  }
}
