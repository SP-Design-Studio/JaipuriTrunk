"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Countdown from "@/components/Countdown";
import { Wordmark } from "@/components/Logo";
import NotifyForm from "@/components/NotifyForm";
import { features, firstLabel, launchLabel, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Who made the site. */
const CREDIT = "Abhiraman Kuntimaddi";
const CREDIT_URL = "https://www.abhiramankuntimaddi.com";

/**
 * The ask, and the sign-off: two full-height scenes. The ask says plainly what you
 * get for leaving an address; the footer closes the page with the wordmark at the
 * width of the page and the credit. Both arrive with the scroll, not on a timer.
 */
export default function Finale() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".f-rise", {
          y: 56,
          opacity: 0,
          ease: "none",
          stagger: 0.18,
          scrollTrigger: {
            trigger: ".f-ask-scene",
            start: "top 75%",
            end: "top 15%",
            scrub: 0.6,
          },
        });
        gsap.from(".f-mark", {
          y: 90,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".f-foot",
            start: "top 85%",
            end: "top 20%",
            scrub: 0.6,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const link =
    "label hover:text-marigold min-h-11 inline-flex items-center border-b border-current/40 transition-colors";

  return (
    <section ref={root} id="notify" className="relative">
      <div className="f-ask-scene bg-cream text-maroon flex min-h-[100svh] items-center py-[var(--space-section)]">
        <div className="f-ask mx-auto grid w-full max-w-[1600px] items-center gap-y-[var(--space-3)] px-[var(--gutter)] md:grid-cols-12 md:gap-x-[2vw]">
          <div className="md:col-span-7">
            <h2 className="f-rise display max-w-[13ch] text-[clamp(2.8rem,7.2vw,7rem)] leading-[1.02] tracking-[-0.02em]">
              Know before the second trunk opens.
            </h2>
          </div>

          <div className="md:col-span-5">
            <p className="f-rise text-ink/70 max-w-[36ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed font-light">
              Leave your email and you&apos;ll hear before it goes up on
              Instagram.
            </p>
            {features.countdown && (
              <div className="f-rise mt-[var(--space-3)]">
                <Countdown />
              </div>
            )}
            <div className="f-rise mt-[var(--space-3)]">
              <NotifyForm />
            </div>
          </div>
        </div>
      </div>

      <footer
        data-cursor-invert
        className="f-foot u-grain u-grain-dark bg-maroon text-cream relative flex min-h-[100svh] flex-col justify-between overflow-hidden pt-[var(--space-4)] pb-[max(var(--gutter),env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-[var(--gutter)]">
          <p className="label text-cream/60">
            {site.name} · {site.city.from} to {site.city.to}
          </p>
          <p className="label text-cream/60">
            The first trunk opened {firstLabel} · The second opens {launchLabel}
          </p>
        </div>

        {/* The wordmark, at the width of the page and shown whole. */}
        <div className="f-mark mx-auto w-full max-w-[1600px] px-[var(--gutter)]">
          <Wordmark className="text-marigold block h-auto w-full" />
        </div>

        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-end justify-between gap-x-8 gap-y-[var(--space-2)] px-[var(--gutter)]">
          <p className="display text-cream/80 text-[clamp(1.05rem,1.4vw,1.3rem)]">
            Website brought to life by{" "}
            <a
              href={CREDIT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cream hover:text-marigold border-b border-current/40 whitespace-nowrap transition-colors"
            >
              {CREDIT}
            </a>
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noreferrer noopener"
              className={link}
            >
              Instagram
            </a>
            <a href={`mailto:${site.social.email}`} className={link}>
              Email
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}
