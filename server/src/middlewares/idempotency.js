const { getRedisClient, isRedisConnected } = require("../config/redis.client");

const DEFAULT_TTL_SECONDS = 600;
const IDEMPOTENCY_PREFIX = "idempotency:";
const CLEANUP_INTERVAL_MS = 60000;

const responseCache = new Map();

const getCacheKey = (req, key) =>
  [
    req.user?._id?.toString?.() || "anonymous",
    req.method,
    req.baseUrl || "",
    req.path || "",
    key,
  ].join("::");

const clearExpiredEntries = () => {
  const now = Date.now();
  const keysToDelete = [];
  for (const [cacheKey, cacheEntry] of responseCache.entries()) {
    if (cacheEntry.expiresAt <= now) {
      keysToDelete.push(cacheKey);
    }
  }
  keysToDelete.forEach((key) => responseCache.delete(key));
  
  if (responseCache.size > 10000) {
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, Math.floor(entries.length / 2));
    toDelete.forEach(([key]) => responseCache.delete(key));
  }
};

const cleanupInterval = setInterval(clearExpiredEntries, CLEANUP_INTERVAL_MS);
cleanupInterval.unref?.();

const getFromRedis = async (key) => {
  if (!isRedisConnected()) return null;
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const data = await redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setInRedis = async (key, value, ttlSeconds) => {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.setEx(`${IDEMPOTENCY_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
  } catch {}
};

const deleteFromRedis = async (key) => {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(`${IDEMPOTENCY_PREFIX}${key}`);
  } catch {}
};

const createIdempotencyMiddleware = ({ ttlSeconds = DEFAULT_TTL_SECONDS } = {}) => {
  return async (req, res, next) => {
    const idempotencyKey = req.header("idempotency-key");
    if (!idempotencyKey) {
      return next();
    }

    const cacheKey = getCacheKey(req, idempotencyKey);

    if (isRedisConnected()) {
      const cached = await getFromRedis(cacheKey);
      if (cached) {
        return res.status(cached.statusCode).json(cached.body);
      }
    } else {
      clearExpiredEntries();
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.status(cached.statusCode).json(cached.body);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 300) {
        const cacheEntry = {
          statusCode,
          body,
          expiresAt: Date.now() + ttlSeconds * 1000,
        };

        if (isRedisConnected()) {
          setInRedis(cacheKey, { statusCode, body }, ttlSeconds);
        } else {
          responseCache.set(cacheKey, cacheEntry);
        }
      }
      return originalJson(body);
    };

    return next();
  };
};

module.exports = {
  createIdempotencyMiddleware,
};
