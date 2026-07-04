import app from "./app";
import { logger } from "./lib/logger";
import { startReminderCron } from "./lib/reminderCron";

// Fail fast if required Supabase env vars are missing
const requiredEnv = ["SUPABASE_JWT_SECRET"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} environment variable is required but was not provided.`);
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
