import app from "../artifacts/api-server/dist/app.mjs";

const required = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Required environment variable "${key}" is not set. ` +
        "Add it to your Vercel project environment variables and redeploy."
    );
  }
}

export default app;