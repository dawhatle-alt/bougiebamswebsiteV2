---
name: Object storage public vs private namespace
description: When uploaded content must be world-readable, upload into the PUBLIC object namespace, not the private dir served by an unauthenticated route.
---

For world-readable uploads (e.g. blog cover images), do NOT reuse the template's
`getObjectEntityUploadURL()` (which writes to `PRIVATE_OBJECT_DIR/uploads/`) and
then serve it from an unauthenticated public route.

**Why:** An unauthenticated serve route backed by `getObjectEntityFile()` resolves
*anything* under `PRIVATE_OBJECT_DIR`, so it turns the entire private namespace
public if paths are guessed — and any *future* private upload silently inherits
that exposure. Flagged in code review as a high-impact data-exposure risk.

**How to apply:** Add a `getPublicUploadURL()` that signs a PUT into the first
`PUBLIC_OBJECT_SEARCH_PATHS` entry and returns an objectPath like
`/public-objects/<key>`. Serve only via a route scoped to that prefix using
`searchPublicObject()` (returns null → 404), and set
`X-Content-Type-Options: nosniff` since presigned PUT means the server never sees
the bytes to MIME-validate. Keep private serving (with ACL gate) on a separate
`/objects/*` route if/when genuinely private files are needed.
