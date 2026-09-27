import { z } from "zod";

/**
 * Environment configuration validator.
 *
 * NEXT_PUBLIC_* values are embedded into the browser bundle by Next.js.
 * Production builds therefore MUST provide an explicit API origin at build time.
 */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !rawApiUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production builds. " +
      "Do not ship a production bundle with the development localhost API."
  );
}

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL must be a valid URL")
    .refine(
      (value) => !isProduction || new URL(value).protocol === "https:",
      "NEXT_PUBLIC_API_URL must use HTTPS in production"
    )
    .default("http://localhost:8080"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: rawApiUrl || "http://localhost:8080",
  NODE_ENV: process.env.NODE_ENV,
});

export type Env = z.infer<typeof envSchema>;
