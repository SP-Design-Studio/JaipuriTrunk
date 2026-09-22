"use client";

import { createContext, useContext, useMemo } from "react";

const AssetContext = createContext<Set<string>>(new Set());

export function AssetProvider({
  paths,
  children,
}: {
  paths: string[];
  children: React.ReactNode;
}) {
  const set = useMemo(() => new Set(paths), [paths]);
  return <AssetContext.Provider value={set}>{children}</AssetContext.Provider>;
}

/** True when the file is actually present in /public. */
export function useHasAsset(src: string) {
  return useContext(AssetContext).has(src);
}
