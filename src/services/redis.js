import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis conectado");
});

redis.on("error", (err) => {
  console.error("Redis erro:", err.message);
});

redis.on("close", () => {
  console.log("Redis desconectado");
});
