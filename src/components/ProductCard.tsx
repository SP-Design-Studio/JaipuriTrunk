"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";
import type { PhotographedItem } from "@/lib/products";

const SHAPE: Record<NonNullable<PhotographedItem["shape"]>, string> = {
  tall: "w-[72vw] sm:w-[38vw] lg:w-[26vw] aspect-3/4",
  square: "w-[78vw] sm:w-[42vw] lg:w-[30vw] aspect-square",
  portrait: "w-[72vw] sm:w-[38vw] lg:w-[26vw] aspect-4/5",
};

/**
 * A fixed set of tilts, picked by a hash of the item id rather than at random —
 * the same card must tilt the same way on the server and the client.
 */
const TILTS = [-5.5, 3.5, -2.5, 4.5, -4, 2.5, -3];
const tiltFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997;
  return TILTS[h % TILTS.length];
};

export default function ProductCard({
  item,
  index,
  category,
}: {
  item: PhotographedItem;
  index: number;
  category: string;
}) {
  const [failed, setFailed] = useState(false);
  const present = useHasAsset(item.src);

  if (failed || !present) return null;

  const tilt = tiltFor(item.id);

  return (
    <figure
      className="pc-card group shrink-0"
      style={{ marginTop: index % 2 ? "7vh" : "-5vh" }}
    >
      {/* Only the sticker tilts — the caption stays level so the type reads. */}
      {/* The resting tilt is a CSS variable read by the rotate utility, not an inline
          `transform`. Tailwind v4 compiles `group-hover:rotate-0` to
          `rotate: none` — a standalone property — which cannot cancel a
          `transform: rotate()`, so the card grew on hover but never actually
          straightened. Both now live in the same property and the hover wins
          on specificity. */}
      <div
        className={`relative rotate-[var(--pc-tilt)] transition-transform duration-[700ms] ease-out group-hover:rotate-0 group-hover:scale-[1.04] ${SHAPE[item.shape ?? "tall"]}`}
        style={{ "--pc-tilt": `${tilt}deg` } as React.CSSProperties}
      >
        <Image
          src={item.src}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 30vw"
          className="pc-img object-contain"
          onError={() => setFailed(true)}
          style={{ filter: "drop-shadow(0 18px 30px rgba(20,24,12,0.38))" }}
        />
      </div>

      <figcaption className="mt-7 max-w-[26ch]">
        <span className="bg-sage/40 block h-px w-8" />
        <h3 className="font-display text-petal mt-4 text-[clamp(1.25rem,2.6vw,1.85rem)] leading-tight tracking-wide">
          {item.name}
        </h3>
        <p className="text-sage/55 mt-2.5 text-[clamp(0.78rem,1.1vw,0.86rem)] tracking-[0.3em] uppercase">
          {category}
        </p>
      </figcaption>
    </figure>
  );
}
