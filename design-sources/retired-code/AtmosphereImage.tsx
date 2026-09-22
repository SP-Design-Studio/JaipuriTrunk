"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";

/**
 * A photograph slot that degrades to a block-print motif when the file is
 * absent, so the layout is never broken by a missing asset.
 */
export default function AtmosphereImage({
  src,
  alt,
  sizes = "50vw",
  className = "",
  motifClass = "text-sand",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  motifClass?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const present = useHasAsset(src);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {failed || !present ? (
        <div className="bg-petal/60 absolute inset-0">
          <svg viewBox="0 0 80 80" className={`h-full w-full ${motifClass}`} aria-hidden="true">
            <defs>
              <pattern id={`bp-${src}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <g fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.55">
                  <path d="M20 6 C27 13 27 27 20 34 C13 27 13 13 20 6 Z" />
                  <path d="M6 20 C13 13 27 13 34 20 C27 27 13 27 6 20 Z" />
                  <circle cx="20" cy="20" r="2.6" />
                  <circle cx="0" cy="0" r="3" />
                  <circle cx="40" cy="40" r="3" />
                </g>
              </pattern>
            </defs>
            <rect width="80" height="80" fill={`url(#bp-${src})`} />
          </svg>
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
