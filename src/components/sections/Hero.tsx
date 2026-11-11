"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Countdown from "@/components/Countdown";
import { HERO_MARK_SIZE, Monogram, Wordmark } from "@/components/Logo";
import ScrollLink from "@/components/ScrollLink";
import { features, launch, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The first screen is the brand and one fact. The monogram, the date, and a quiet
 * line saying what it is: nothing competes with them.
 */
export default function Hero({
  ready,
  markOn,
}: {
  /** The loader has landed: the type may rise. */
  ready: boolean;
  /** The loader is gone: the hero's own monogram takes over, exactly in place. */
  markOn: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".h-rise", { yPercent: 105 });
        gsap.set(".h-fade", { opacity: 0, y: 14 });
        gsap.set(".h-line", { scaleX: 0 });
        if (!ready) return;

        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .to(".h-line", { scaleX: 1, duration: 1.6 }, 0.1)
          .to(".h-rise", { yPercent: 0, duration: 1.4 }, 0.2)
          .to(
            ".h-fade",
            { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 },
            0.3,
          );

        gsap.to(".h-stage", {
          yPercent: -8,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      // The monogram leans a little toward the pointer, and no more.
      mm.add(
        "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
        () => {
          if (!ready) return;
          const el = root.current;
          if (!el) return;
          const x = gsap.quickTo(".h-drift", "x", {
            duration: 1.4,
            ease: "power3.out",
          });
          const y = gsap.quickTo(".h-drift", "y", {
            duration: 1.4,
            ease: "power3.out",
          });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x(((e.clientX - r.left) / r.width - 0.5) * -18);
            y(((e.clientY - r.top) / r.height - 0.5) * -14);
          };
          el.addEventListener("pointermove", move);
          return () => el.removeEventListener("pointermove", move);
        },
      );

      return () => mm.revert();
    },
    { scope: root, dependencies: [ready] },
  );

  return (
    <section
      ref={root}
      data-hero
      data-cursor-invert
      className="u-grain u-grain-dark bg-maroon text-cream relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(62% 58% at 50% 44%, #8d1c3b 0%, #801834 56%, #6a1229 100%)",
        }}
      />

      <header className="h-fade relative z-20 flex items-center justify-between gap-6 px-[var(--gutter)] pt-[max(var(--gutter),env(safe-area-inset-top))]">
        <ScrollLink href="/" aria-label={`${site.name}, back to the top`}>
          <Wordmark className="text-marigold h-[1.05rem] w-auto sm:h-[1.2rem]" />
        </ScrollLink>
        <ScrollLink
          href="/#notify"
          className="label hover:text-marigold inline-flex min-h-11 items-center border-b border-current/40 pb-0.5 transition-colors"
        >
          Notify me
        </ScrollLink>
      </header>

      <div className="h-stage relative z-10 flex flex-1 flex-col items-center justify-center px-[var(--gutter)] py-[var(--space-2)] text-center">
        <div
          className="h-mark"
          data-hero-mark
          style={{ opacity: markOn ? 1 : 0 }}
        >
          <div className="h-drift">
            <Monogram className={`text-marigold ${HERO_MARK_SIZE}`} />
          </div>
        </div>

        <div className="h-line bg-marigold/60 mt-[var(--space-3)] h-px w-[clamp(3rem,7vw,6rem)] origin-center" />

        <h1 className="mt-[var(--space-2)]">
          <span className="sr-only">
            {site.eyebrow}, {launch.day} {launch.month} {launch.year}
          </span>
          <span
            aria-hidden="true"
            className="block overflow-hidden pb-[0.18em]"
          >
            <span className="h-rise display block text-[clamp(1.9rem,3.6vw,3.1rem)] tracking-[0.01em]">
              {site.eyebrow}
            </span>
          </span>
        </h1>

        <div className="h-fade mt-[var(--space-2)] flex flex-col items-center gap-[var(--space-1)]">
          <div className="flex items-center gap-[var(--space-2)]">
            <span
              aria-hidden="true"
              className="bg-marigold/60 h-px w-[clamp(1.5rem,5vw,4rem)]"
            />
            <p className="display text-marigold text-[clamp(1.7rem,3.4vw,3rem)] leading-none tracking-[0.01em]">
              {launch.day} {launch.month} {launch.year}
            </p>
            <span
              aria-hidden="true"
              className="bg-marigold/60 h-px w-[clamp(1.5rem,5vw,4rem)]"
            />
          </div>
          <p className="label text-cream/70">In {site.city.to}</p>
        </div>
      </div>

      <footer className="h-fade relative z-10 grid items-end gap-[var(--space-2)] px-[var(--gutter)] pb-[max(var(--gutter),env(safe-area-inset-bottom))] sm:grid-cols-[1fr_auto_1fr]">
        <p className="display text-cream/80 hidden max-w-[26ch] text-balance text-[clamp(1.1rem,1.6vw,1.4rem)] leading-snug sm:block">
          {site.tagline}
        </p>
        <div className="justify-self-center">
          {features.countdown && <Countdown tone="dark" compact />}
        </div>
        <p className="display text-cream/80 max-w-[16ch] justify-self-center text-center text-[clamp(1.15rem,1.7vw,1.5rem)] leading-tight text-balance sm:justify-self-end sm:text-right">
          Scroll to see what was unpacked
        </p>
      </footer>
    </section>
  );
}
