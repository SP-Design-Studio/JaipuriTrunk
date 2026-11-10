import { first, launch, site } from "@/lib/site";

/**
 * Everything on the "Our trunks" timeline and in the photograph gallery behind it.
 * To change that section, edit this file and nothing else.
 *
 * - Add a trunk: add an entry to `trunks` (oldest first).
 * - Add photographs: put the files in `public/images/stall/<slug>/` and list them in
 *   that trunk's `photos`. They are pinned on the board in the order listed.
 * - A trunk whose date has passed gets the gallery button.
 *
 * Photographs are shown in their own shape, uncropped; give each one's pixel size as `w` and `h`.
 */

/** Words used on the timeline and in the gallery. */
export const trunksSection = {
  title: "Our trunks",
  galleryButton: "See the stall",
  closeButton: "Close",
  emptyNote: "The photographs from the stall are on their way.",
  today: "Today",
} as const;

export type Photo = {
  /** Path under /public, for example /images/stall/first/photo-1.jpg */
  src: string;
  /** What is in the photograph, for screen readers. */
  alt: string;
  /** An optional line printed under the photograph. */
  caption?: string;
  /** The photograph's pixel size, so it is shown in its own shape. */
  w: number;
  h: number;
};

export type Trunk = {
  /** Also the folder name under public/images/stall/. */
  slug: string;
  name: string;
  /** When it opens or opened. Decides whether the gallery button shows. */
  iso: string;
  date: { day: string; month: string; year: string };
  note: string;
  /** The heading of the gallery. */
  galleryTitle: string;
  photos: Photo[];
};

export const trunks: Trunk[] = [
  {
    slug: "first",
    name: "The first trunk",
    iso: site.firstISO,
    date: first,
    note: "Unpacked and opened.",
    galleryTitle: "The first trunk, at the Kompound flea market",
    photos: [
      {
        src: "/images/stall/first/photo-1.webp",
        alt: "The Jaipuri Trunk stall at the Kompound flea market: the maroon banner, the table of juttis and jewellery, and the trunk in front",
        w: 1135,
        h: 2000,
      },
      {
        src: "/images/stall/first/photo-2.webp",
        alt: "Smiling in a maroon saree and oxidised silver jewellery, talking with a customer at the stall",
        w: 1133,
        h: 2000,
      },
      {
        src: "/images/stall/first/photo-3.webp",
        alt: "Oxidised silver earrings on Jaipuri Trunk cards, hung on a black display stand",
        w: 1131,
        h: 2000,
      },
      {
        src: "/images/stall/first/photo-4.webp",
        alt: "An oxidised silver necklace and earrings with coloured stones, on a bust at the stall",
        w: 1126,
        h: 2000,
      },
      {
        src: "/images/stall/first/photo-5.webp",
        alt: "Two women at the stall beside the trunk, under the Jaipuri Trunk banner",
        w: 1129,
        h: 2000,
      },
    ],
  },
  {
    slug: "second",
    name: "The second trunk",
    iso: site.launchISO,
    date: launch,
    note: "Opens in Hyderabad.",
    galleryTitle: "The second trunk, at the stall",
    photos: [],
  },
];
