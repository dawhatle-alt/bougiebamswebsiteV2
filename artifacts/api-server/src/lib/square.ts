import { logger } from "./logger";

export function getSquareClient() {
  const { SquareClient, SquareEnvironment } = require("square");
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  const envVar = process.env.SQUARE_ENVIRONMENT;
  const env = envVar === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
  if (!envVar) {
    logger.warn("SQUARE_ENVIRONMENT not set — defaulting to Sandbox");
  }
  return new SquareClient({ token, environment: env });
}

export function getSquareLocationId(): string {
  return process.env.SQUARE_LOCATION_ID ?? "";
}

export function isSandboxMode(): boolean {
  return process.env.SQUARE_ENVIRONMENT !== "production";
}
