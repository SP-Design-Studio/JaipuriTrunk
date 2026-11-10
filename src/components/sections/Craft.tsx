"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useHasAsset } from "@/components/AssetProvider";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATEMENT =
  "Every piece in the trunk is made by hand, by karigars in Jaipur. We choose it, pack it, and carry it south. That is all we do.";

type Fig = {
  src: string;
  alt: string;
  caption: string;
  w: number;
  h: number;
};

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

/**
 * Craft, as one full-height scene driven by the scroll. First the sentence lights
 * up word by word. Then it clears away and the three photographs of hands rise on the empty stage,
 * one after another, each tied to where you are in the scroll. The scene is sticky
 * inside a tall section, so nothing is pinned by script.
 *
 * Reduced motion: the sentence, then the photographs in a plain column.
 *
 * The copy makes only the claims the brand can stand behind: it is made by hand,
 * in Jaipur, and we choose it, pack it and carry it. No counts, no timings.
 */
export default function Craft() {
  const root = useRef<HTMLElement>(null);
  const words = STATEMENT.split(" ");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".c-word", { opacity: 0.14 });
        gsap.set(".c-fig", {
          opacity: 0,
          yPercent: 80,
          rotate: (i: number) => [-4, 3, -2][i] ?? 0,
        });

        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.7,
            },
          })
          // The sentence, word by word.
          .to(".c-word", { opacity: 1, stagger: 0.14, duration: 0.6 }, 0)
          // It clears the stage completely, so nothing is ever set over the words;
          // then the photographs rise, one after another.
          .to(".c-statement", { opacity: 0, y: -40, duration: 0.9 }, 4.5)
          .to(
            ".c-fig-1",
            { opacity: 1, yPercent: 0, rotate: -2, duration: 1.4 },
            5.5,
          )
          .to(
            ".c-fig-2",
            { opacity: 1, yPercent: 0, rotate: 1.5, duration: 1.4 },
            6.2,
          )
          .to(
            ".c-fig-3",
            { opacity: 1, yPercent: 0, rotate: -1, duration: 1.4 },
            6.9,
          )
          .to({}, { duration: 1.4 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="craft"
      className="u-grain bg-paper text-maroon relative h-[460svh] motion-reduce:h-auto"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden motion-reduce:static motion-reduce:flex motion-reduce:h-auto motion-reduce:flex-col motion-reduce:overflow-visible motion-reduce:py-[var(--space-section)]">
        <div className="mx-auto flex h-full w-full max-w-[1600px] items-center px-[var(--gutter)]">
          <h2 className="c-statement display max-w-[19ch] text-[clamp(2.3rem,6.6vw,6.6rem)] leading-[1.02] md:max-w-[22ch]">
            {words.map((w, i) => (
              <span key={i} className="c-word inline-block">
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
        </div>

        {FIGURES.map((f, i) => (
          <Figure key={f.src} fig={f} n={i + 1} />
        ))}
      </div>
    </section>
  );
}

function Figure({ fig, n }: { fig: Fig; n: number }) {
  const present = useHasAsset(fig.src);
  if (!present) return null;
  return (
    <figure
      className={`c-fig c-fig-${n}`}
      style={{ aspectRatio: `${fig.w} / ${fig.h}` }}
    >
      <div className="relative h-full w-full">
        <Image
          src={fig.src}
          alt={fig.alt}
          fill
          sizes="(max-width: 768px) 60vw, 34vw"
          className="object-contain"
          style={{ filter: "drop-shadow(0 10px 16px rgba(36,26,29,0.18))" }}
        />
      </div>
      <figcaption className="text-maroon/65 absolute top-full left-0 mt-[var(--space-1)] w-max min-w-full max-w-[min(28ch,60vw)] text-sm leading-snug motion-reduce:static">
        {fig.caption}
      </figcaption>
    </figure>
  );
}
