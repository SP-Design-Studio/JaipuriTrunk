"use client";

import { useCallback, useState } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import { AssetProvider } from "@/components/AssetProvider";
import Act1Arrival from "@/components/acts/Act1Arrival";
import Act2Bazaar from "@/components/acts/Act2Bazaar";
import Act3Craft from "@/components/acts/Act3Craft";
import Act4Trunk from "@/components/acts/Act4Trunk";
import Act5Unpacked from "@/components/acts/Act5Unpacked";

export default function Experience({ assets }: { assets: string[] }) {
  const [ready, setReady] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  const reveal = useCallback(() => setReady(true), []);
  const finished = useCallback(() => {
    // Unmount outside GSAP's rAF tick. Rendering from inside the ticker can
    // collide with ScrollTrigger's pin-spacer DOM surgery further down the page.
    requestAnimationFrame(() => setShowPreloader(false));
  }, []);

  return (
    <AssetProvider paths={assets}>
      <SmoothScroll />
      <Cursor />
      {showPreloader && <Preloader onReveal={reveal} onFinished={finished} />}
      <main>
        <Act1Arrival ready={ready} />
        <Act2Bazaar />
        <Act3Craft />
        <Act4Trunk />
        <Act5Unpacked />
      </main>
    </AssetProvider>
  );
}
