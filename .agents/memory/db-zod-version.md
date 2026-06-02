---
name: drizzle-zod / zod version mismatch
description: drizzle-zod emits zod-v4-shaped types but artifact tsconfigs can't resolve the `zod/v4` subpath
---

The `zod` catalog version is v3.25.x, but `drizzle-zod` (0.8.x) generates schemas whose
types match zod **v4**'s `ZodObject<...{ out; in }...>` shape. The intended import inside
`lib/db` schema files is `import { z } from "zod/v4"` (see the commented example in
`lib/db/src/schema/index.ts`).

**Two traps:**
1. Passing a refinement callback to `createInsertSchema(table, { col: (s) => s.email(...) })`
   triggers a `ZodType` constraint error (v3 vs v4 type instance mismatch). Use plain
   `createInsertSchema(table).omit({...})` without refinements.
2. The `api-server` tsconfig (extends `tsconfig.base.json`) does **not** resolve the
   `zod/v4` subpath — `import { z } from "zod/v4"` fails with TS2307 there, even though it
   works inside `lib/db`.

**How to apply:** Keep drizzle schemas in `lib/db` minimal (no zod refinements). Do request
validation inside Express routes with a plain regex / manual check rather than importing zod
in the api-server. After changing a `lib/db` schema, run `pnpm run typecheck:libs`
(`tsc --build`) to regenerate the `dist/*.d.ts` or downstream artifacts see stale exports.
