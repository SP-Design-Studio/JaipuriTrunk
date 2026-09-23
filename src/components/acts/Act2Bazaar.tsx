"use client";

import { Fragment, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ProductCard from "@/components/ProductCard";
import { categories, photosOf } from "@/lib/products";
import { acts } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const act = acts[1];

export default function Act2Bazaar() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      if (!el) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) return;

      const distance = () => el.scrollWidth - window.innerWidth;

      /**
       * A beat of stillness at each end, as a fraction of the travel.
       *
       * Without it the rail starts moving the instant the section pins, and
       * the opening plate — which carries the act's heading and its only
       * intro copy — is fully legible for just 31px of a 3233px drag on a
       * phone, because at 78vw the plate nearly fills the screen and any
       * translation clips its text. The closing card had the same problem.
       * Desktop hides this: cards are 30vw there, so the text sits well
       * inside the card and never reaches an edge.
       */
      const HOLD = 0.09;

      /**
       * Scroll pixels spent per pixel the rail travels.
       *
       * Desktop stays 1:1. A phone cannot afford it: the same twelve cards
       * need 3233px of rail travel there, and at 1:1 that is nearly four
       * screen-heights of dragging through a single act. Cards are far wider
       * relative to a phone screen, so each one still crosses the viewport in
       * plenty of scroll at 0.6 — the walk gets brisker, not blurrier, and
       * the layout is untouched.
       */
      const pace = () => (window.innerWidth < 768 ? 0.6 : 1);

      /** Total scroll the act occupies, holds included. */
      const span = () => Math.round(distance() * pace() * (1 + 2 * HOLD));

      // The scroll range covers both holds as well as the travel, so the holds
      // add reading time rather than slowing the walk down.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${span()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      tl.to({}, { duration: HOLD })
        .to(el, { x: () => -distance(), ease: "none", duration: 1 })
        .to({}, { duration: HOLD });

      // Cards breathe as they cross the centre of the viewport
      gsap.utils.toArray<HTMLElement>(".pc-card").forEach((card) => {
        gsap.fromTo(
          card,
          { scale: 0.94, opacity: 0.55 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: tl,
              start: "left 88%",
              end: "left 45%",
              scrub: true,
            },
          },
        );
      });

      // Same extended range as the pin, so the progress bar still reaches the
      // end exactly as the rail does rather than filling early and sitting
      // full through the closing hold.
      gsap.to(".a2-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${span()}`,
          scrub: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="bazaar"
      /* The one dark act. The cursor reads the attribute and swaps to its
         pale palette here — maroon on olive-deep is close to invisible. */
      data-cursor-invert
      className="u-grain relative overflow-hidden bg-olive-deep"
    >
      {/* `lvh`, not `svh`, because this act is PINNED.

          On iOS and iPadOS the URL bar collapses once you scroll, and the
          viewport grows from `svh` (chrome shown) to `lvh` (chrome hidden). A
          pinned element is fixed at the height it was given, so one sized in
          `svh` stops short of the bottom of the enlarged viewport and the next
          section shows through as a strip beneath it.

          `lvh` is safe for pinning in a way `dvh` is not: both `svh` and `lvh`
          are static per device and orientation, so ScrollTrigger's measured pin
          height never changes under it, while `dvh` would rethrash on every
          scroll. Content caps elsewhere in this file stay in `svh` on purpose —
          those guard against the SMALL viewport, so the content still fits
          while the chrome is showing. */}
      <div className="flex h-[100lvh] items-center">
        <div
          ref={track}
          className="flex items-center gap-[5vw] px-[8vw] will-change-transform"
        >
          {/* Opening plate */}
          <div className="w-[78vw] shrink-0 sm:w-[42vw] lg:w-[30vw]">
            <h2 className="mt-4 leading-[1.05]">
              <span className="font-display text-petal block text-[clamp(2.4rem,6vw,4.4rem)]">
                {act.label}
              </span>
              <span className="text-sage mt-3 block text-[clamp(0.86rem,1.6vw,1.05rem)] tracking-[0.3em] uppercase">
                {act.sub}
              </span>
            </h2>
            <div className="bg-sage/30 my-7 h-px w-16" />
            <p className="text-petal/65 max-w-[36ch] text-[clamp(0.98rem,1.7vw,1.12rem)] leading-relaxed font-light">
              We went to Jaipur looking for three things. Juttis you can
              actually walk in, earrings people stop you to ask about, and bags
              that are still block-printed a metre at a time.
            </p>
            <p className="text-sage/50 mt-8 flex items-center gap-3 text-[clamp(0.78rem,1.15vw,0.9rem)] tracking-[0.3em] uppercase">
              <span className="bg-sage/40 h-px w-10" />
              Scroll to walk the stall
            </p>
          </div>

          {categories.map((cat) => (
            <Fragment key={cat.id}>
              {/* Category plate */}
              <div className="w-[62vw] shrink-0 sm:w-[30vw] lg:w-[21vw]">
                <h3 className="font-display text-petal text-[clamp(1.5rem,3.2vw,2.3rem)] leading-tight">
                  {cat.title}
                </h3>
                <div className="bg-sage/30 my-5 h-px w-10" />
                <p className="text-petal/60 max-w-[28ch] text-[clamp(0.95rem,1.6vw,1.05rem)] leading-relaxed font-light">
                  {cat.blurb}
                </p>
                <ul className="mt-6 space-y-1.5">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="text-sage/80 flex items-baseline gap-3 text-[clamp(0.78rem,1.25vw,0.94rem)] tracking-[0.18em] uppercase"
                    >
                      <span className="bg-sage/40 h-px w-4 shrink-0 translate-y-[-0.25em]" />
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>

              {photosOf(cat).map((item, i) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  category={cat.title}
                />
              ))}
            </Fragment>
          ))}

          {/* Closing plate */}
          <div className="w-[72vw] shrink-0 pr-[6vw] sm:w-[38vw] lg:w-[26vw]">
            <p className="font-display text-sage text-[clamp(1.8rem,4vw,3rem)] leading-tight">
              And plenty more
            </p>
            <p className="text-petal/60 mt-4 max-w-[30ch] leading-relaxed font-light">
              still being packed. The first trunk reaches Hyderabad shortly.
            </p>
          </div>
        </div>
      </div>

      {/* Rail progress */}
      <div className="absolute inset-x-[8vw] bottom-10 h-px bg-petal/12">
        {/* Start state inline, in the property GSAP animates. Tailwind v4's
            `scale-x-0` sets the standalone `scale` property while GSAP writes
            `transform: scaleX()`; both applied, so `scale: 0 1` held this bar
            at zero for the whole rail and the progress indicator never drew. */}
        <div
          className="a2-progress bg-rose h-px origin-left"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </section>
  );
}
