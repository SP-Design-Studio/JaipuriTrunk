/**
 * Real symbologies for the trunk tag, so the codes on it carry actual data
 * rather than decorative noise.
 */

/**
 * A QR code for the brand's Instagram, pre-computed rather than generated at
 * runtime: the URL is a constant, so encoding it on every render would ship a
 * QR library to the browser to produce the same 29x29 grid every time.
 *
 * Generated with the `qrcode` package at error-correction level M and verified
 * by decoding it back with `jsqr`. To change the URL you must regenerate this
 * — editing QR_URL alone will leave the matrix pointing at the old address,
 * which is why `assertQrMatches` exists.
 */
export const QR_URL = "https://instagram.com/jaipuri_trunk";
export const QR_SIZE = 29;
/** Row-major, '1' = dark module. 29x29 = 841 characters. */
export const QR_MATRIX =
  "1111111001011001111110111111110000010011110000110101000001101110101011001010111010111011011101011110000010100101110110111010111001110011001011101100000101010011110101010000011111111010101010101010111111100000000111101000000100000000101111100110101001010011111001010100101111000111111111000101010010000100010010110010000000001001101001010011001110101011101001110000010100010110001000000011111101001111110001101001101100011110101001011001111110001001101101100101001001011011010000111100000101100111010010101100010011011101011001011110100001000001000010010111100010100100001111100010101001111111100111011111101110000000010111110100010001111111111110011011110111101011100100000101000010110101000100011011101010111011110011111011010111010100010001111000001111101110101110011110111111111101000001000101010100011011101011111110101001001001000000100";

/**
 * Code 39, the symbology those classic tags are printed in.
 *
 * Each character is nine elements — five bars and four spaces, alternating,
 * starting and ending on a bar — of which exactly three are wide. The symbol is
 * bracketed by `*` start and stop characters and characters are separated by a
 * narrow gap. It is self-checking and needs no checksum, which is why it is
 * still used for asset tags.
 */
const C39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "*": "nwnnwnwnn",
};

export type Element = { bar: boolean; units: number };

/**
 * Encodes `text` and returns the bar/space run lengths, stops included.
 *
 * Widths are in narrow units — wide elements are 3, which is the usual ratio.
 * Callers lay these out in an SVG viewBox whose width is the unit total, so the
 * ratios survive at any rendered size.
 */
export function encode39(text: string): Element[] {
  const chars = ["*", ...text.toUpperCase().split(""), "*"];
  const out: Element[] = [];
  chars.forEach((ch, i) => {
    const pattern = C39[ch];
    if (!pattern)
      throw new Error(`Code 39 cannot encode ${JSON.stringify(ch)}`);
    for (let k = 0; k < 9; k++) {
      out.push({ bar: k % 2 === 0, units: pattern[k] === "w" ? 3 : 1 });
    }
    // Characters are separated by one narrow space; the stops bracket the rest.
    if (i < chars.length - 1) out.push({ bar: false, units: 1 });
  });
  return out;
}

/** Total width of a symbol, in narrow units. */
export const widthOf = (els: Element[]) => els.reduce((n, e) => n + e.units, 0);

/**
 * The drawable form: bar rectangles with their offsets, and the total width.
 *
 * Kept here rather than in the component because laying the runs out means
 * advancing a cursor, and React forbids that kind of reassignment during a
 * render. A pure function outside the component says the same thing and is
 * testable on its own.
 */
export function bars39(text: string): {
  total: number;
  bars: { x: number; w: number }[];
} {
  const els = encode39(text);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const el of els) {
    if (el.bar) bars.push({ x, w: el.units });
    x += el.units;
  }
  return { total: x, bars };
}
