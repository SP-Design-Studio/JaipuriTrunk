import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealOptions = {
  /** Where it starts, besides being transparent. Default: 56px below. */
  from?: gsap.TweenVars;
  /** Where it settles. Default: in place. */
  to?: gsap.TweenVars;
  /** When the entry plays: element edge, then viewport edge. */
  start?: string;
  /** Seconds to wait once the entry is triggered. */
  delay?: number;
  duration?: number;
  /** Fade and lift away as it leaves the top of the screen. Default: yes. */
  exit?: boolean;
};

/**
 * One entry and one exit for one element, the same everywhere on the site.
 *
 *  - Entry: it rises into place when it comes up into view, and eases back out if you
 *    scroll back up past it. Timed, not scrubbed, so it always arrives gracefully.
 *  - Exit: it lifts and fades in step with the scroll as it leaves the top.
 *
 * Call it inside a `gsap.matchMedia()` "no-preference" branch, so it is reverted
 * with the rest and reduced motion simply sees the element as it is.
 */
export function reveal(el: Element, opts: RevealOptions = {}) {
  const {
    from = { y: 56 },
    to = { y: 0 },
    start = "top 88%",
    delay = 0,
    duration = 1.3,
    exit = true,
  } = opts;

  gsap.set(el, { opacity: 0, ...from });
  const enter = gsap.to(el, {
    opacity: 1,
    ...to,
    duration,
    delay,
    ease: "expo.out",
    paused: true,
  });
  ScrollTrigger.create({
    trigger: el,
    start,
    onEnter: () => enter.play(),
    onLeaveBack: () => enter.reverse(),
  });

  if (exit) {
    // The exit uses its own properties (a filter fade and a percentage lift), so it can
    // never fight the entry over `opacity` and `y`.
    gsap.fromTo(
      el,
      { filter: "opacity(1)", yPercent: 0 },
      {
        filter: "opacity(0)",
        yPercent: -16,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: "bottom 26%",
          end: "bottom -4%",
          scrub: true,
        },
      },
    );
  }
}

/**
 * Just the exit, for an element that is not entering on its own (a pinned scene, a
 * sticky card): it fades and lifts, tied to the scroll, between two positions of
 * `trigger`. Uses the same properties as the exit in `reveal`.
 */
export function leave(
  el: Element,
  trigger: Element,
  { start = "bottom bottom", end = "bottom 38%", to = 0.15, lift = -8 } = {},
) {
  gsap.fromTo(
    el,
    { filter: "opacity(1)", yPercent: 0 },
    {
      filter: `opacity(${to})`,
      yPercent: lift,
      ease: "none",
      immediateRender: false,
      scrollTrigger: { trigger, start, end, scrub: true },
    },
  );
}
