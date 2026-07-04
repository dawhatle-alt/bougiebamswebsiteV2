import app from "./app";
import { logger } from "./lib/logger";
import { startReminderCron } from "./lib/reminderCron";

// Hard-fail on secrets required for every request
const hardRequired = ["SUPABASE_JWT_SECRET"] as const;
for (const key of hardRequired) {
  if (!process.env[key]) {
    throw new Error(
      `${key} environment variable is required but was not provided. ` +
        "Add it to your environment secrets and restart the server."
    );
  }
}

// Warn on secrets needed for specific features (server still starts without them)
const warnIfMissing = [
  "SUPABASE_SERVICE_ROLE_KEY", // required for image uploads via Supabase Storage
  "RESEND_API_KEY",            // required for email delivery
  "EMAIL_FROM",                // required for email delivery
  "OWNER_EMAIL",               // required for contact email delivery
  "PUBLIC_WEB_ORIGIN",         // required for Square redirect URLs in production
] as const;
for (const key of warnIfMissing) {
  if (!process.env[key]) {
    // Use process.stderr so it's visible even before pino is initialised
    process.stderr.write(`[WARN] ${key} is not set — related features will be disabled\n`);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startReminderCron();
});
