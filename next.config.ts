import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `next dev` and `next build` both own `.next` by default, so running a
   * build while a dev server is up rewrites the module graph underneath it —
   * the dev server then serves stale chunks and reports parse errors for code
   * that no longer exists on disk, until it is restarted.
   *
   * Setting NEXT_DIST_DIR sends a build somewhere else, so a verification
   * build can run alongside a live dev server. Unset in normal use and on
   * Vercel, where the default `.next` is what the platform expects.
   */
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
