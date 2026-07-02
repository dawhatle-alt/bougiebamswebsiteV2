import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./lib/securityHeaders";

const app: Express = express();

// Behind Replit's (or any) reverse proxy, the real client IP is in
// X-Forwarded-For. Trust one proxy hop so req.ip is the client, not the proxy —
// this is what makes the rate limiters per-client instead of one global bucket.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Allow only the storefront origin(s) to call the API from a browser. Without an
// explicit allowlist we send no CORS headers (blocking cross-origin browser
// calls) rather than the previous wide-open "*".
function allowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.PUBLIC_WEB_ORIGIN) {
    origins.push(process.env.PUBLIC_WEB_ORIGIN.replace(/\/+$/, ""));
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  return origins;
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl, server-to-server) send no Origin — allow them.
    if (!origin) return callback(null, true);
    const allow = allowedOrigins();
    if (allow.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
app.use(cors(corsOptions));
// Cap request bodies to blunt memory-abuse; blog/event content stays well under.
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

app.use("/api", router);

export default app;
