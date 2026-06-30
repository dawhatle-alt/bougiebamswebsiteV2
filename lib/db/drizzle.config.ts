import { defineConfig } from "drizzle-kit";
import path from "path";

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

const supabaseUrl = "postgresql://postgres.gsnljjezxlfjlxtdtrpu:%40i4GQc%24rD3J8XHZ@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: isSupabase
    ? { url: supabaseUrl }
    : { url: process.env.DATABASE_URL! },
});
