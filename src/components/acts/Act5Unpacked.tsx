"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Countdown from "@/components/Countdown";
import NotifyForm from "@/components/NotifyForm";
import { acts, features, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const act = acts[4];

export default function Act5Unpacked() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".a5-rise", {
        y: 34,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.11,
        scrollTrigger: { trigger: root.current, start: "top 62%" },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="unpacked"
      className="u-grain relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-petal/50 pt-[12vh] pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
    >
      {/* The Hyderabad facade used to sit in a left column here. It anchors
          that end of the journey in the hero now, and showing the same
          building twice weakened both — so this act is a single centred
          column and the invitation carries it. */}
      <div className="mx-auto w-full max-w-[640px] px-[clamp(1.5rem,6vw,4rem)]">
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="a5-rise">
            <span className="font-display text-maroon block text-[clamp(2.2rem,5vw,3.6rem)]">
              {act.label}
            </span>
            <span className="text-olive mt-3 block text-[clamp(0.8rem,1.45vw,1rem)] tracking-[0.3em] uppercase">
              {act.sub}
            </span>
          </h2>

          <p className="a5-rise text-ink/70 mt-7 max-w-lg text-[clamp(1rem,2vw,1.15rem)] leading-relaxed font-light">
            The first trunk opens in Hyderabad soon. Leave your email and
            you&apos;ll hear about it before it goes up on Instagram.
          </p>

          {features.countdown && (
            <div className="a5-rise mt-10 w-full">
              <Countdown />
            </div>
          )}

          <div className="a5-rise mt-10 w-full">
            <NotifyForm />
          </div>

          <div className="a5-rise mt-10 flex items-center gap-6 sm:gap-8">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noreferrer noopener"
              className="text-maroon/75 hover:text-maroon text-[clamp(0.78rem,1.15vw,0.9rem)] tracking-[0.3em] uppercase transition-colors"
            >
              Instagram
            </a>
            <span className="bg-maroon/20 h-3 w-px" />
            <a
              href={`mailto:${site.social.email}`}
              className="text-maroon/75 hover:text-maroon text-[clamp(0.78rem,1.15vw,0.9rem)] tracking-[0.3em] uppercase transition-colors"
            >
              Email
            </a>
          </div>
        </div>
      </div>

      {/* Same grid as the content above, so the footer lines up with the
          right-hand column instead of centring across the whole section. */}
      <div className="mx-auto w-full max-w-[640px] px-[clamp(1.5rem,6vw,4rem)]">
        <footer className="text-ink/45 mt-10 text-center text-[clamp(0.78rem,1.1vw,0.86rem)] tracking-[0.25em] uppercase">
          {site.name} &nbsp;·&nbsp; {site.city.from} to {site.city.to}
        </footer>
      </div>
    </section>
  );
}
