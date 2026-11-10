# v1 scroll acts (retired)

The first version of the page: five pinned, scroll-driven acts (hero journey, a
horizontal product rail, craft, the trunk, sign-up).

Kept on disk for reference, and excluded from the build. They no longer compile on
their own: they import `acts` from `@/lib/site`, which is gone.

Replaced by `src/components/sections/`. The 3D trunk (`three/TrunkScene.tsx`) and its
2D fallback (`Trunk.tsx`) were brought back into `src/components/` and are live again.
