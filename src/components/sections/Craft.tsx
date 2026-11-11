"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { reveal } from "@/lib/motion";
import { useHasAsset } from "@/components/AssetProvider";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Fig = {
  src: string;
  alt: string;
  caption: string;
  w: number;
  h: number;
};

/**
 * The statement, as three thoughts set one clause to a line: what it is, what we do,
 * and a quiet full stop. Only claims the brand can stand behind: it is made by hand,
 * in Jaipur, and we choose it, pack it and carry it. No counts, no timings.
 */
const THOUGHTS = [
  ["Every piece in the trunk is made by hand,", "by karigars in Jaipur."],
  ["We choose it, pack it,", "and carry it south."],
  ["That is all we do."],
];

const FIGURES: Fig[] = [
  {
    src: "/images/craft/craft-hands-1-sticker.webp",
    alt: "A karigar’s hands finishing the sole of an embroidered jutti",
    caption: "Finishing the sole of an embroidered jutti",
    w: 976,
    h: 1190,
  },
  {
    src: "/images/craft/craft-hands-3-sticker.webp",
    alt: "A hand stacked with bangles, holding a pair of oxidised jhumkas",
    caption: "A hand full of bangles, holding oxidised jhumkas",
    w: 884,
    h: 1144,
  },
  {
    src: "/images/craft/craft-hands-2-sticker.webp",
    alt: "A hand holding a finished piece of Jaipuri jewellery",
    caption: "A finished piece, held up",
    w: 892,
    h: 1082,
  },
];

/** A slight, different lean for each photograph, and a different drop on wide screens. */
const LEAN = [-2, 1.5, -1.2];
const DROP = ["md:mt-0", "md:mt-[8vw]", "md:mt-[2vw]"];

/**
 * Craft: the statement, then the three photographs it describes, each with its
 * caption. Each part has an entry and an exit (see `reveal` in lib/motion): the
 * lines of the statement rise in one after another, each photograph settles into
 * place with its caption following, and all of it lifts away as it leaves. The
 * photographs also respond to the pointer.
 *
 * Reduced motion: everything is simply there.
 */
export default function Craft() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The lines of the statement, one after another.
        gsap.utils.toArray<HTMLElement>(".c-line").forEach((line, i) => {
          reveal(line, {
            from: { y: 34 },
            start: "top 90%",
            delay: i === 0 ? 0 : 0.08,
            duration: 1.3,
          });
        });

        // Each photograph settles into its tilt, its caption a beat behind.
        gsap.utils.toArray<HTMLElement>(".c-item").forEach((item, i) => {
          const fig = item.querySelector(".c-fig");
          const cap = item.querySelector(".c-cap");
          if (fig)
            reveal(fig, {
              from: { y: 90, rotate: LEAN[i] * 3 },
              to: { y: 0, rotate: LEAN[i] },
              start: "top 90%",
              duration: 1.5,
            });
          if (cap)
            reveal(cap, {
              from: { y: 12 },
              start: "top 90%",
              delay: 0.5,
              duration: 1,
              exit: false,
            });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="craft"
      className="u-grain bg-paper text-maroon relative px-[var(--gutter)] py-[var(--space-section)]"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <h2
          className="c-statement display mx-auto text-center text-[clamp(1.9rem,4vw,4.2rem)]"
          /* Set here, not as classes: `.display` sets line-height and tracking
             outside the utility layer and would win over `leading-*`/`tracking-*`. */
          style={{ lineHeight: 1.34, letterSpacing: "0.002em" }}
        >
          {THOUGHTS.map((lines, ti) => (
            <span key={ti} className={`block ${ti > 0 ? "mt-[0.9em]" : ""}`}>
              {lines.map((line, li) => (
                <span key={li} className="c-line block [text-wrap:balance]">
                  {line}
                </span>
              ))}
            </span>
          ))}
        </h2>

        <ul className="mt-[var(--space-section)] grid grid-cols-1 gap-x-[4vw] gap-y-[var(--space-4)] md:grid-cols-3 md:items-start">
          {FIGURES.map((fig, i) => (
            <li key={fig.src} className={`c-item ${DROP[i]}`}>
              <Figure fig={fig} lean={LEAN[i]} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Figure({ fig, lean }: { fig: Fig; lean: number }) {
  const present = useHasAsset(fig.src);
  if (!present) return null;
  return (
    <figure className="group mx-auto flex w-[min(68vw,22rem)] flex-col items-center md:w-full md:max-w-[26rem]">
      <div
        className="c-fig relative w-full"
        style={{
          aspectRatio: `${fig.w} / ${fig.h}`,
          transform: `rotate(${lean}deg)`,
        }}
      >
        {/* The print lifts and turns a little under the pointer. */}
        <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:-translate-y-2 group-hover:rotate-[1.2deg] group-hover:scale-[1.04]">
          <Image
            src={fig.src}
            alt={fig.alt}
            fill
            sizes="(max-width: 768px) 68vw, 26rem"
            className="object-contain transition-[filter] duration-700 group-hover:[filter:drop-shadow(0_22px_30px_rgba(36,26,29,0.24))]"
            style={{ filter: "drop-shadow(0 14px 22px rgba(36,26,29,0.18))" }}
          />
        </div>
      </div>
      <figcaption className="c-cap text-maroon/60 mt-[var(--space-2)] max-w-[28ch] text-center text-sm leading-snug">
        {fig.caption}
      </figcaption>
    </figure>
  );
}
