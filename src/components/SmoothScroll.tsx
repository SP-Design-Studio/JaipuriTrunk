"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /**
     * iOS Safari and Chrome Android grow and shrink the viewport as the URL
     * bar hides on scroll. Every one of those is reported as a resize, and a
     * resize makes ScrollTrigger recompute every pin — mid-scroll, which
     * yanks a pinned act out from under the reader and can leave the trunk or
     * the bazaar rail offset for the rest of the section.
     *
     * This tells ScrollTrigger to ignore resizes on touch devices that only
     * change the viewport HEIGHT. A genuine orientation change alters the
     * width too, so those still refresh.
     */
    ScrollTrigger.config({ ignoreMobileResize: true });

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
