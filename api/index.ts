/**
 * Vercel serverless entry point.
 *
 * This file wraps the Express app as a single serverless function so that all
 * /api/* traffic on Vercel is handled by the existing route layer — no routes
 * need to be split into individual functions.
 *
 * Required secrets for Vercel environment:
 *   DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
 *   SUPABASE_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 *   SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, SQUARE_WEBHOOK_SIGNATURE_KEY,
 *   EMAIL_FROM, OWNER_EMAIL, RESEND_API_KEY, PUBLIC_WEB_ORIGIN
 */

// Validate required secrets at cold start — fail loudly if any are missing
const required = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Required environment variable "${key}" is not set. ` +
        "Add it to your Vercel project environment variables and redeploy."
    );
  }
}

import app from "../artifacts/api-server/src/app";

export default app;
