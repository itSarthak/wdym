import { createClient } from "redis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    // Enable TCP keepalive — cloud Redis (e.g. RedisLabs) kills idle sockets
    // after ~10 min, causing silent drops that make subsequent commands throw.
    keepAlive: true,
    keepAliveInitialDelay: 30000,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) return new Error("Redis: too many reconnect attempts")
      return Math.min(retries * 100, 3000)
    },
  },
});

redis.on("error", (err) => console.error("Redis error:", err));

export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}
