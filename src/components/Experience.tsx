"use client";

import { useCallback, useState } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import SiteHeader from "@/components/SiteHeader";
import { AssetProvider } from "@/components/AssetProvider";
import Hero from "@/components/sections/Hero";
import Collection from "@/components/sections/Collection";
import Craft from "@/components/sections/Craft";
import Trunk from "@/components/sections/Trunk";
import Route from "@/components/sections/Route";
import Finale from "@/components/sections/Finale";

export default function Experience({ assets }: { assets: string[] }) {
  const [ready, setReady] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  const reveal = useCallback(() => setReady(true), []);
  const finished = useCallback(() => {
    // Unmount outside GSAP's rAF tick. Rendering from inside the ticker can
    // collide with ScrollTrigger's DOM work further down the page.
    requestAnimationFrame(() => setShowPreloader(false));
  }, []);

  return (
    <AssetProvider paths={assets}>
      <SmoothScroll />
      <Cursor />
      {showPreloader && <Preloader onReveal={reveal} onFinished={finished} />}
      <SiteHeader />
      <main>
        <Hero ready={ready} markOn={!showPreloader} />
        <Collection />
        <Craft />
        <Trunk />
        <Route />
        <Finale />
      </main>
    </AssetProvider>
  );
}
