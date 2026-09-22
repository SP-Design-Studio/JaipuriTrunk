import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Server-only. Walks /public/images at render time and returns the web paths
 * that actually exist, so the client never requests an image that isn't there.
 *
 * Without this, every unsupplied photo fires a `/_next/image` request that
 * 400s — console noise in dev, and a billed function invocation in production.
 */
export function existingImagePaths(): string[] {
  const root = join(process.cwd(), "public");
  const found: string[] = [];

  const walk = (dir: string, webPrefix: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const abs = join(dir, entry.name);
      const web = `${webPrefix}/${entry.name}`;
      if (entry.isDirectory()) walk(abs, web);
      else if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(entry.name)) found.push(web);
    }
  };

  walk(join(root, "images"), "/images");
  return found;
}
