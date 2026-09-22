"use client";

/** A stylised Charminar — the Hyderabad end of the journey. */
export default function Charminar({ className }: { className?: string }) {
  const minaret = (x: number) => (
    <g key={x} transform={`translate(${x} 0)`}>
      <rect x="-16" y="120" width="32" height="180" fill="currentColor" />
      <rect x="-22" y="112" width="44" height="12" rx="3" fill="currentColor" />
      <rect x="-20" y="72" width="40" height="42" rx="4" fill="currentColor" />
      <rect x="-26" y="64" width="52" height="10" rx="3" fill="currentColor" />
      <path d="M-18 64 C-18 34 18 34 18 64 Z" fill="currentColor" />
      <path d="M0 34 L0 14" stroke="currentColor" strokeWidth="3" />
      <circle cx="0" cy="10" r="5" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox="0 0 480 320" className={className} aria-hidden="true" fill="currentColor">
      {/* Main block with four arches */}
      <rect x="60" y="180" width="360" height="120" />
      <rect x="48" y="168" width="384" height="16" rx="4" />
      {[130, 240, 350].map((x, i) => (
        <path
          key={i}
          d={`M${x - 44} 300 L${x - 44} 246 C${x - 44} 208 ${x + 44} 208 ${x + 44} 246 L${x + 44} 300 Z`}
          fill="var(--color-cream)"
        />
      ))}
      {/* Upper gallery */}
      <rect x="96" y="140" width="288" height="30" />
      <rect x="88" y="132" width="304" height="10" rx="3" />
      {[60, 420].map(minaret)}
      {[124, 356].map((x) => (
        <g key={x} transform={`translate(${x} 44)`} opacity="0.75">
          <rect x="-10" y="88" width="20" height="52" fill="currentColor" />
          <path d="M-12 88 C-12 66 12 66 12 88 Z" fill="currentColor" />
        </g>
      ))}
      <rect x="0" y="298" width="480" height="22" />
    </svg>
  );
}
