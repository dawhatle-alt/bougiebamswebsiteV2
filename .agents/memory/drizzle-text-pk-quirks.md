---
name: Drizzle text primary key quirks
description: text().primaryKey() breaks eq() and insert().values() type inference in this version of drizzle-orm; use serial id + unique text column instead.
---

Using `text("col").primaryKey()` causes two separate typecheck failures:

1. `eq(table.col, value)` — TypeScript cannot match the `PgColumn<{ isPrimaryKey: true }>` against the `eq` overloads, producing confusing "Aliased<string | string[]>" errors.
2. `insert().values({ col: value })` / `.onConflictDoUpdate({ target: table.col })` — the insert value type and conflict target both fail to resolve, even when the value is obviously `string`.

**Why:** In this version of drizzle-orm, the `isPrimaryKey: true` brand on the column type changes its inferred shape in ways the `eq` and `insert` overloads don't handle for text (non-serial) types.

**How to apply:** For any table where the natural key is a string (e.g. `sku`), define the schema as:
```ts
export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  ...
});
```
Use `sql\`col = ${value}\`` for WHERE clauses involving the unique text column, and explicit `as string` casts on `req.params.*` values before passing them to Drizzle.
