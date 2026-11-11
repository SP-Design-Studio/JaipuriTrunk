"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * A Next.js link to a place on this page: `href="/"` for the top, `href="/#notify"` for
 * the sign-up. It is a real link, so it works without script, opens in a new tab on
 * middle-click, and Next scrolls to the target itself. With the smooth-scroll engine
 * running, the click glides there instead of jumping.
 */
export default function ScrollLink({
  href,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        const lenis = window.__lenis;
        if (e.defaultPrevented || !lenis) return;
        // Leave modified clicks (new tab, new window) to the browser.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const id = href.split("#")[1];
        const target = id ? document.getElementById(id) : null;
        if (id && !target) return;
        e.preventDefault();
        lenis.scrollTo(target ?? 0, { duration: 1.6 });
      }}
    />
  );
}
