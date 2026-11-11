"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { trunksSection, type Photo } from "@/lib/trunks";

/** Board columns: 3 on wide screens, 2 on tablets, and on phones (1) the pile. */
function subscribe(cb: () => void) {
  const qs = ["(min-width: 1024px)", "(min-width: 768px)"].map((q) =>
    window.matchMedia(q),
  );
  qs.forEach((q) => q.addEventListener("change", cb));
  return () => qs.forEach((q) => q.removeEventListener("change", cb));
}
const columnCount = () =>
  window.matchMedia("(min-width: 1024px)").matches
    ? 3
    : window.matchMedia("(min-width: 768px)").matches
      ? 2
      : 1;

/** A small fixed lean per photograph, so the board never reads as a grid. */
const LEAN = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3.5, 2];
const lean = (i: number) => LEAN[i % LEAN.length];
/** When each photograph is pinned: one after another, then faster if there are many. */
const delayOf = (i: number) =>
  i < 10 ? 0.4 + i * 0.6 : 0.4 + 10 * 0.6 + (i - 10) * 0.15;

const PINS = ["#801834", "#f49b49", "#4f6b48", "#b8445f"];

/** A push pin seen from above: a flat base, a domed head, a highlight and a cast shadow. */
function Pin({ colour, className }: { colour: string; className?: string }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={`pin-head size-8 ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}s`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#241a1d" stopOpacity="0.38" />
          <stop offset="1" stopColor="#241a1d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="21" rx="12" ry="8" fill={`url(#${id}s)`} />
      <circle cx="16" cy="15" r="11" fill={colour} />
      <circle cx="16" cy="15" r="11" fill="#000" opacity="0.32" />
      <circle cx="16" cy="14" r="8.6" fill={colour} />
      <circle cx="16" cy="14" r="8.6" fill={`url(#${id}d)`} />
      <ellipse
        cx="13"
        cy="10.6"
        rx="3.2"
        ry="1.9"
        fill="#fff"
        opacity="0.75"
        transform="rotate(-32 13 10.6)"
      />
    </svg>
  );
}

/** One photograph, printed in its own shape with a border and held by a pin. */
function Print({
  photo,
  rot,
  delay,
  pin,
  rest = false,
  width,
  className,
}: {
  photo: Photo;
  rot: number;
  delay: number;
  pin: string;
  /** Already pinned and now sitting under newer ones: no entrance. */
  rest?: boolean;
  /** CSS width of the print; the board lets its column decide. */
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`${rest ? "pin-rest" : "pin-print"} relative bg-[#faf3e6] p-[3%] ${className ?? ""}`}
      style={
        {
          "--rot": `${rot}deg`,
          "--d": `${delay}s`,
          width,
        } as React.CSSProperties
      }
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.w}
        height={photo.h}
        sizes="(max-width: 767px) 80vw, 30vw"
        loading="eager"
        className="block h-auto w-full"
      />
      {photo.caption && (
        <p className="text-ink/70 pt-[3%] text-[clamp(0.7rem,0.95vw,0.85rem)] leading-tight">
          {photo.caption}
        </p>
      )}
      <Pin
        colour={pin}
        className="absolute top-0 left-1/2 w-[clamp(1.6rem,2.4vw,2.1rem)]"
      />
    </div>
  );
}

/** Tablets and larger: the board. Each photograph is pinned up in turn, no scrolling needed. */
function Board({
  title,
  photos,
  cols,
}: {
  title: string;
  photos: Photo[];
  cols: number;
}) {
  const columns = Array.from({ length: cols }, (_, c) =>
    photos.map((photo, i) => ({ photo, i })).filter(({ i }) => i % cols === c),
  );
  return (
    <div
      className="mx-auto mt-[var(--space-3)] flex w-full max-w-[1040px] items-start gap-[var(--space-3)] pb-[var(--space-3)]"
      role="list"
      aria-label={title}
    >
      {columns.map((col, c) => (
        <div
          key={c}
          className={`flex flex-1 flex-col gap-[var(--space-3)] ${c % 2 === 1 ? "pt-[var(--space-4)]" : ""}`}
        >
          {col.map(({ photo, i }) => (
            <div key={photo.src} role="listitem" className="px-[2%] pt-3">
              <Print
                photo={photo}
                rot={lean(i)}
                delay={delayOf(i)}
                pin={PINS[i % PINS.length]}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Phones: a pile. One photograph is pinned at a time; swipe or tap Next to pin the
 * next on top, and the ones before it stay underneath, a little askew.
 */
function Pile({ photos }: { photos: Photo[] }) {
  const [at, setAt] = useState(0);
  const startX = useRef<number | null>(null);
  const go = (d: number) =>
    setAt((v) => Math.min(photos.length - 1, Math.max(0, v + d)));
  const shown = photos
    .map((photo, j) => ({ photo, j }))
    .slice(Math.max(0, at - 2), at + 1);

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="relative flex-1"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx < -40) go(1);
          else if (dx > 40) go(-1);
        }}
      >
        {shown.map(({ photo, j }) => {
          const below = at - j;
          return (
            <div
              key={photo.src}
              className="absolute inset-0 grid place-items-center pt-4"
            >
              <Print
                photo={photo}
                rot={below ? lean(j) + (j % 2 ? 1 : -1) * below * 3 : lean(j)}
                delay={0}
                pin={PINS[j % PINS.length]}
                rest={below > 0}
                width={`min(80vw, calc(56dvh * ${photo.w / photo.h}))`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-4 py-[var(--space-2)]">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={at === 0}
          className="label border-maroon/40 min-h-12 border px-5 disabled:opacity-30"
        >
          Back
        </button>
        <p className="label tnum text-maroon/70">
          {at + 1} / {photos.length}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={at === photos.length - 1}
          className="label bg-maroon text-cream min-h-12 px-5 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * The photographs from one trunk, in a full-screen sheet. A native <dialog>: focus is
 * trapped, Escape closes it, and the page behind is inert. Smooth scrolling is paused
 * while it is open, and the custom cursor is raised above it.
 */
export default function StallGallery({
  title,
  photos,
  open,
  onClose,
}: {
  title: string;
  photos: Photo[];
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cols = useSyncExternalStore(subscribe, columnCount, () => 3);
  const [closing, setClosing] = useState(false);

  /** Closing plays its exit first; the dialog is only closed once it has finished. */
  const requestClose = () => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 380);
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      window.__lenis?.stop();
      // A modal dialog sits in the top layer; raise the cursor above it.
      const cursor = document.getElementById("cursor-layer");
      try {
        if (cursor?.matches(":popover-open")) {
          cursor.hidePopover();
          cursor.showPopover();
        }
      } catch {
        /* no popover support: nothing to raise */
      }
    }
    if (!open && d.open) d.close();
    return () => {
      if (open) window.__lenis?.start();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      /* Escape plays the same exit as the Close button. */
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      data-closing={closing || undefined}
      aria-label={title}
      className="bg-paper text-maroon fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto overscroll-contain p-0 backdrop:bg-transparent"
      style={{
        backgroundImage: "url(/images/texture/grain-dark.png)",
        backgroundSize: "256px 256px",
      }}
      data-lenis-prevent
    >
      {open && (
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-[var(--gutter)] pb-[var(--space-1)]">
          <div className="flex items-center justify-between gap-4 py-[var(--space-1)]">
            <h2 className="display text-[clamp(1.3rem,2.8vw,2.4rem)] leading-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              className="label border-maroon/40 hover:bg-maroon hover:text-cream min-h-11 shrink-0 border px-5 transition-colors"
            >
              {trunksSection.closeButton}
            </button>
          </div>
          {photos.length === 0 ? (
            <p className="text-ink/70 mt-[var(--space-3)] max-w-[40ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed font-light">
              {trunksSection.emptyNote}
            </p>
          ) : cols === 1 ? (
            <Pile photos={photos} />
          ) : (
            <Board title={title} photos={photos} cols={cols} />
          )}
        </div>
      )}
    </dialog>
  );
}
