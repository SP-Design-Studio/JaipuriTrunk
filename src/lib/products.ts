export type Item = {
  id: string;
  name: string;
  /**
   * Path under /public/images/products/. Omitted for items we stock but have
   * no photograph of yet — those still appear in the written lists, they just
   * don't get a card in the rail.
   */
  src?: string;
};

type Category = {
  id: string;
  title: string;
  /** One line of context. Keep it factual — no invented provenance. */
  blurb: string;
  items: Item[];
};

export const categories: Category[] = [
  {
    id: "juttis",
    title: "Jaipuri juttis",
    blurb: "Leather and embroidered flats, finished by hand.",
    items: [
      {
        id: "leather-juttis",
        name: "Leather juttis",
        src: "/images/products/leather-juttis.webp",
      },
      {
        id: "embroidered-juttis",
        name: "Embroidered juttis",
        src: "/images/products/embroidered-juttis.webp",
      },
      { id: "khussa-shoes", name: "Khussa shoes" },
    ],
  },
  {
    id: "jewellery",
    title: "Statement oxidised jewellery",
    blurb: "Oxidised silver-tone. For wearing often, not saving for weddings.",
    items: [
      {
        id: "jhumkas",
        name: "Jhumkas",
        src: "/images/products/jhumkas.webp",
      },
      {
        id: "enamel-oxidised-earrings",
        name: "Enamel oxidised earrings",
        src: "/images/products/enamel-oxidised-earrings.webp",
      },
      {
        id: "khadas",
        name: "Khadas",
        src: "/images/products/khadas.webp",
      },
      {
        id: "kundan-chandbalis",
        name: "Oxidised Kundan chandbalis",
        src: "/images/products/chandbalis.webp",
      },
      {
        id: "drop-motif-earrings",
        name: "Drop motif earrings",
        src: "/images/products/drop-motif-earrings.webp",
      },
    ],
  },
  {
    id: "bags",
    title: "Quilted Jaipur bags",
    blurb: "Quilted cotton, block-printed by hand.",
    items: [
      {
        id: "quilted-handbags",
        name: "Quilted handbags",
        src: "/images/products/quilted-handbags.webp",
      },
      {
        id: "quilted-pouches",
        name: "Quilted pouches",
        src: "/images/products/quilted-pouches.webp",
      },
      { id: "sling-bags", name: "Sling bags" },
    ],
  },
];

/** An item we actually have a photograph of, so `src` is guaranteed. */
type PhotographedItem = Item & { src: string };

const hasPhoto = (item: Item): item is PhotographedItem => Boolean(item.src);

/** Flat list of everything we stock, photographed or not. */
export const allItems: Item[] = categories.flatMap((c) => c.items);

/** Only the items with a photograph — these are the ones that get a card. */
export const photographedItems: PhotographedItem[] = allItems.filter(hasPhoto);

/** The photographed items within one category, in order. */
export const photosOf = (category: Category): PhotographedItem[] =>
  category.items.filter(hasPhoto);
