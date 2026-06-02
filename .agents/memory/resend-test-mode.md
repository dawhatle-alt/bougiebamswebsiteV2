---
name: Resend test mode delivery limit
description: BougieBams Resend connector only delivers to the account owner until a domain is verified
---

The Resend integration (used by `artifacts/api-server` for contact, event-registration, and
welcome-offer emails via `connectors.proxy("resend", "/emails", ...)`) is in **test mode**.
Resend returns HTTP 403 (`validation_error`) for any recipient that is not the account
owner's own email, with the message to verify a domain at resend.com/domains and use a
`from` address on that domain.

**Why:** the `from` address is `onboarding@resend.dev` (Resend's shared sandbox sender),
which can only send to the verified account owner until the user verifies their own domain.

**How to apply:** Treat welcome/transactional email sends as best-effort — log the failure
and still return success / persist the data (the subscribe route does this). Don't debug
"email not arriving" as a code bug; it's the test-mode limit. Tell the user they must verify
a domain in Resend and update `FROM_ADDRESS` to send to arbitrary recipients in production.
