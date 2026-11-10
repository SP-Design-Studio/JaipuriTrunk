"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";

/**
 * A die-cut product sticker on its own — no frame, no caption. The shared
 * treatment used wherever a product appears outside the Act 2 rail.
 */
export default function Sticker({
  src,
  alt,
  tilt = 0,
  sizes = "40vw",
  className = "",
  tone = "light",
}: {
  src: string;
  alt: string;
  /** Degrees. Keep it small; these read as laid-out pieces, not confetti. */
  tilt?: number;
  sizes?: string;
  className?: string;
  /** Which ground it sits on, so the shadow reads as a shadow. */
  tone?: "light" | "dark";
}) {
  const [failed, setFailed] = useState(false);
  const present = useHasAsset(src);

  if (failed || !present) return null;

  return (
    // The image is laid out with `fill`, so className MUST carry a position
    // utility — `relative` for flow, `absolute` for a placed cluster.
    <div className={className} style={{ transform: `rotate(${tilt}deg)` }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain"
        onError={() => setFailed(true)}
        style={{
          filter:
            tone === "dark"
              ? "drop-shadow(0 14px 22px rgba(0,0,0,0.38))"
              : "drop-shadow(0 8px 14px rgba(36,26,29,0.16))",
        }}
      />
    </div>
  );
}
