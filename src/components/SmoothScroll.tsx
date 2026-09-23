"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    /**
     * Re-measure once the page has actually settled.
     *
     * Pins are measured when their triggers are created, which here is while
     * the preloader is still up and before the webfonts have swapped in. Both
     * change block heights. On a desktop the following resize corrects it, but
     * `ignoreMobileResize` below suppresses exactly that correction on touch
     * devices — so on an iPad the pinned acts kept whatever height they were
     * given in that first moment, permanently, and came up short of the bottom
     * of the screen with the next act showing through beneath them.
     *
     * `ignoreMobileResize` only suppresses AUTOMATIC refreshes from resize
     * events; calling refresh directly still works, which is what makes this
     * the fix rather than a fight with the setting.
     */
    let cancelled = false;
    const remeasure = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };
    const onSettled = () => {
      // Fonts are the big one: Marcellus and Jost change line heights, which
      // changes how tall the pinned acts' content is.
      document.fonts?.ready.then(remeasure).catch(remeasure);
      // And once more after the browser has finished its own load-time
      // settling, which on iOS includes the toolbar taking its final height.
      window.setTimeout(remeasure, 400);
    };
    if (document.readyState === "complete") onSettled();
    else window.addEventListener("load", onSettled, { once: true });

    const teardownRefresh = () => {
      cancelled = true;
      window.removeEventListener("load", onSettled);
    };

    // Everything below is the smooth-scroll rig, which reduced motion opts out
    // of. The re-measure above must NOT be inside that early return: the pins
    // still exist under reduced motion, so they still need measuring correctly.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return teardownRefresh;
    }

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
      teardownRefresh();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
