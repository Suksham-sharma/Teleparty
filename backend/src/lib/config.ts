import dotenv from "dotenv";

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const PORT = Number(process.env.PORT ?? 4000);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const JWT_SECRET = required("JWT_SECRET", "dev-only-insecure-secret");

export const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";
export const CALLS_ENABLED = Boolean(
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
);

export const S3_BUCKET = process.env.S3_BUCKET ?? "easy-deploy";
export const AWS_REGION = process.env.AWS_REGION ?? "ap-south-1";
export const CDN_HOST =
  process.env.CDN_HOST ?? "https://d3uupbz3igyr5f.cloudfront.net";

if (
  process.env.NODE_ENV === "production" &&
  JWT_SECRET === "dev-only-insecure-secret"
) {
  throw new Error(
    "JWT_SECRET must be set to a real secret in production — refusing to start."
  );
}
