"use client";

import { useEffect, useState } from "react";
import { scrollToId } from "@/lib/scroll";
import { Wordmark } from "@/components/Logo";
import { launch, site } from "@/lib/site";

/**
 * A slim bar that appears once the hero is behind you and steps aside when the
 * sign-up is on screen, so the one thing the page asks is always one tap away
 * and never shown twice.
 */
export default function SiteHeader() {
  const [pastHero, setPastHero] = useState(false);
  const [atAsk, setAtAsk] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const ask = document.querySelector<HTMLElement>(".f-ask");
    const foot = document.querySelector<HTMLElement>(".f-foot");
    if (!hero || !ask || !foot) return;
    const a = new IntersectionObserver(
      ([e]) => setPastHero(!e.isIntersecting),
      { rootMargin: "-8% 0px 0px 0px" },
    );
    // The bar steps aside for the sign-up and for the footer, which has its own.
    const showing = new Set<Element>();
    const b = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) showing.add(e.target);
          else showing.delete(e.target);
        }
        setAtAsk(showing.size > 0);
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    a.observe(hero);
    b.observe(ask);
    b.observe(foot);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);

  const shown = pastHero && !atAsk;

  return (
    <header
      aria-hidden={!shown}
      className={`bg-cream/95 text-maroon fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 px-[var(--gutter)] pt-[env(safe-area-inset-top)] transition-transform duration-500 ease-[var(--ease-expo)] ${shown ? "translate-y-0" : "-translate-y-full"}`}
    >
      <button
        type="button"
        tabIndex={shown ? 0 : -1}
        onClick={() => scrollToId("top")}
        aria-label={`${site.name}, back to the top`}
        className="flex min-h-12 items-center"
      >
        <Wordmark className="h-[0.95rem] w-auto" />
      </button>
      <div className="flex items-center gap-5">
        <p className="label text-maroon/60 hidden sm:block">
          {site.eyebrow} · {launch.day} {launch.month}
        </p>
        <button
          type="button"
          tabIndex={shown ? 0 : -1}
          onClick={() => scrollToId("notify")}
          className="label bg-maroon text-cream hover:bg-maroon-deep min-h-10 px-4 transition-colors"
        >
          Notify me
        </button>
      </div>
    </header>
  );
}
