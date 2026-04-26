import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
});

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

redis.on("error", (err) => console.error("Redis error:", err));

export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}
