import type { Metadata, Viewport } from "next";
import { marcellus, yatra, jost, shivaraja } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description:
    "A curated trunk of Jaipuri earrings, juttis and block-print bags, carried from Rajasthan's bazaars to Hyderabad. Launching soon.",
  keywords: [
    "Jaipuri jewellery",
    "oxidised earrings",
    "Rajasthani juttis",
    "block print bags",
    "Hyderabad",
    "Jaipur",
  ],
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: "Handpicked in Jaipur. Unpacked in Hyderabad. Launching soon.",
    type: "website",
  },
};

export const viewport: Viewport = {
  /* Tints the iOS/Android browser chrome to the brand maroon, so the URL bar
     stops reading as a grey strip bolted onto a cream page. */
  themeColor: "#8a1f4b",
  /* Lets the page fill the display past the notch and the home indicator, and
     is what gives env(safe-area-inset-*) a non-zero value — without it those
     insets resolve to 0 and the padding below does nothing. */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${shivaraja.variable} ${yatra.variable} ${jost.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
