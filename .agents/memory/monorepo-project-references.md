---
name: Monorepo TS project references vs dist
description: Why a schema/lib change can pass at runtime but fail typecheck until you rebuild the lib's dist
---

# Shared lib changes need a dist rebuild for typecheck

Artifacts (e.g. `artifacts/api-server`) consume shared libs like `@workspace/db`
(`lib/db`) through **TypeScript project references** (`references` in their tsconfig).

- **Runtime** uses the lib's **source** (package `exports` point at `./src/...`, and
  the dev build bundles via esbuild), so a source-only change works when running.
- **Typecheck** (`tsc -p ... --noEmit`) reads the referenced project's **built
  `dist/*.d.ts`**, not its source. If you edit `lib/db/src` (e.g. add a Drizzle
  column) and don't rebuild, typecheck fails with stale-type errors like
  "Property 'X' does not exist on type ...".

**How to apply:** after editing any `lib/*` source that other artifacts import,
rebuild its declarations before typechecking dependents:
`pnpm exec tsc -b lib/db/tsconfig.json` (the `lib/*` packages have no `build`
npm script — use `tsc -b` directly). For DB column changes also run
`pnpm --filter @workspace/db run push` to apply the schema to the database.
