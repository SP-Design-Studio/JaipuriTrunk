"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Sticker from "@/components/Sticker";
import { acts } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const act = acts[2];

const LINES = [
  // Each entry is revealed as its own masked line, so every one of these has
  // to FIT on a single line in the column. Break them badly and the mask slides
  // a two-line block, which reads as a stray orphaned word.
  //
  // The binding constraint is a 360px-wide phone: the column is 312px there and
  // the type is already at its clamp floor, so it cannot shrink to cope. That
  // works out at about 39 characters. Measure after any edit rather than
  // counting by eye — 42 characters fits at 390px and wraps at 360px.
  "A pair of jhumkas passes through six",
  "hands before it gets to you. One person",
  "casts the silver. Another blackens it.",
  "A third sets the stones. Beading is",
  "somebody's whole job. We are just the",
  "last pair of hands that bring it south.",
];

export default function Act3Craft() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Pinned and scrubbed, like Acts 2 and 4: the copy writes itself out as
      // you scroll rather than firing once on entry.
      const tl = gsap.timeline({
        scrollTrigger: reduce
          ? { trigger: root.current, start: "top 70%" }
          : {
              trigger: root.current,
              start: "top top",
              end: "+=170%",
              pin: true,
              scrub: 1,
              anticipatePin: 1,
            },
      });

      tl.from(".a3-head", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
      })
        .from(
          ".a3-line",
          {
            yPercent: 110,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.45,
          },
          0.5,
        )
        .from(
          ".a3-stat",
          {
            y: 22,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.2,
          },
          "-=0.5",
        )
        .from(
          ".a3-par",
          {
            y: 70,
            opacity: 0,
            duration: 1.1,
            ease: "power2.out",
            stagger: 0.45,
          },
          0.35,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="craft"
      className="u-grain relative flex h-[100lvh] items-center overflow-hidden bg-petal/45"
    >
      <div className="mx-auto grid w-full max-w-[1400px] 2xl:max-w-[1720px] grid-cols-1 items-center gap-[clamp(1.5rem,3vw,3rem)] px-[clamp(1.5rem,6vw,4rem)] lg:grid-cols-[0.85fr_1fr] lg:gap-[clamp(1.5rem,4vw,3.5rem)]">
        {/* Copy column */}
        <div className="lg:ml-auto lg:max-w-[32rem]">
          <h2 className="a3-head mt-4 leading-[1.05]">
            <span className="font-display text-maroon block text-[clamp(2.4rem,6vw,4.4rem)]">
              {act.label}
            </span>
            <span className="text-olive mt-3 block text-[clamp(0.86rem,1.6vw,1.05rem)] tracking-[0.3em] uppercase">
              {act.sub}
            </span>
          </h2>

          <div className="a3-copy mt-10">
            {LINES.map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <span className="a3-line text-ink/85 block text-[clamp(1.12rem,2.3vw,1.65rem)] leading-[1.6] font-light">
                  {line}
                </span>
              </span>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
            {[
              { n: "06", l: "Bazaars walked" },
              { n: "48h", l: "Jaipur to Hyderabad" },
              { n: "0", l: "Middlemen" },
            ].map((s) => (
              <div key={s.l} className="a3-stat">
                <p className="font-display text-maroon text-[clamp(1.6rem,3.5vw,2.4rem)] leading-none">
                  {s.n}
                </p>
                <p className="text-olive/70 mt-2 text-[clamp(0.78rem,1.1vw,0.88rem)] tracking-[0.28em] uppercase">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* The act is about whose hands made it, so these are the hands
            themselves rather than another look at the finished products.

            Placed absolutely, not stacked in flow: flow made each one small,
            because the pinned viewport caps the column's height. The offsets
            below are tuned against each file's OPAQUE bounds, not its box —
            every cutout carries a wide transparent margin (hands-2's art
            fills only the left 73% / top 55% of its frame), so boxes that
            merely sit side by side leave a visible hole. These sit close
            enough to read as one cluster while the die-cut borders stay
            clear of each other. */}
        <div className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100svh-31rem))] lg:mr-auto lg:ml-0 lg:max-w-[min(100%,78svh)]">
          <Sticker
            src="/images/craft/craft-hands-1-sticker.webp"
            alt="An artisan's hands finishing the sole of an embroidered jutti"
            tilt={-5}
            sizes="(max-width: 1024px) 60vw, 30vw"
            className="a3-par absolute top-0 right-0 aspect-4/5 w-[54%]"
          />
          <Sticker
            src="/images/craft/craft-hands-3-sticker.webp"
            alt="A hand stacked with bangles, holding a pair of oxidised jhumkas"
            tilt={6}
            sizes="(max-width: 1024px) 54vw, 26vw"
            className="a3-par absolute bottom-0 left-0 aspect-4/5 w-[47%]"
          />
          <Sticker
            src="/images/craft/craft-hands-2-sticker.webp"
            alt="A hand holding a finished piece of Jaipuri jewellery"
            tilt={-9}
            sizes="(max-width: 1024px) 38vw, 18vw"
            className="a3-par absolute top-[55%] right-0 aspect-4/5 w-[52%]"
          />
        </div>
      </div>
    </section>
  );
}
