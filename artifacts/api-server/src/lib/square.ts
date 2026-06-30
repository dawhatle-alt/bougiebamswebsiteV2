import { logger } from "./logger";

export function getSquareClient() {
  const { SquareClient, SquareEnvironment } = require("square");
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  const envVar = process.env.SQUARE_ENVIRONMENT;
  const env = envVar === "sandbox"
    ? SquareEnvironment.Sandbox
    : SquareEnvironment.Production;
  if (!envVar) {
    logger.warn("SQUARE_ENVIRONMENT not set — defaulting to Production");
  }
  return new SquareClient({ token, environment: env });
}

export function getSquareLocationId(): string {
  return process.env.SQUARE_LOCATION_ID ?? "";
}
