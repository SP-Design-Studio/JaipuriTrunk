import localFont from "next/font/local";
import { Jost } from "next/font/google";

/**
 * The Seasons: the display face for every heading, the date and the numerals.
 * Light is the working weight; Regular is the fallback for anything that asks for
 * more weight. Upright only: the site uses no italics.
 */
export const seasons = localFont({
  src: [
    {
      path: "../../public/fonts/the-seasons/the-seasons-light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/the-seasons/the-seasons-regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-seasons",
  display: "swap",
});

export const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});
