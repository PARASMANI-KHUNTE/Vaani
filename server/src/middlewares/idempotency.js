const DEFAULT_TTL_MS = 10 * 60 * 1000;

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
  for (const [cacheKey, cacheEntry] of responseCache.entries()) {
    if (cacheEntry.expiresAt <= now) {
      responseCache.delete(cacheKey);
    }
  }
};

const createIdempotencyMiddleware = ({ ttlMs = DEFAULT_TTL_MS } = {}) => {
  return (req, res, next) => {
    const idempotencyKey = req.header("idempotency-key");
    if (!idempotencyKey) {
      return next();
    }

    clearExpiredEntries();
    const cacheKey = getCacheKey(req, idempotencyKey);
    const cached = responseCache.get(cacheKey);

    if (cached) {
      return res.status(cached.statusCode).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 300) {
        responseCache.set(cacheKey, {
          statusCode,
          body,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return originalJson(body);
    };

    return next();
  };
};

module.exports = {
  createIdempotencyMiddleware,
};
