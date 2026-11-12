const { createClient } = require("redis");
const env = require("./env");
const logger = require("../utils/logger");

const CONNECT_TIMEOUT_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_ERROR_LOGS = 2;

let redisClient = null;
let isConnected = false;
let errorLogCount = 0;

const isRedisEnabled = () => Boolean(env.redis.enabled);
const isUpstashConfigured = () => Boolean(env.redis.upstashUrl && env.redis.upstashToken);

// ============================================================================
// In-memory fallback
// ----------------------------------------------------------------------------
// Implements the subset of Redis commands used across the app so that local
// development (and deployments without Redis) keep working. Keys expire
// lazily on access, which is enough for dedupe caches, idempotency records,
// refresh-token revocation and the offline message queue.
// ============================================================================

const createMemoryStore = () => {
  const strings = new Map(); // key -> { value, expiresAt }
  const sets = new Map(); // key -> { members: Set, expiresAt }
  const lists = new Map(); // key -> { items: string[], expiresAt }

  const isExpired = (entry) => Boolean(entry && entry.expiresAt && entry.expiresAt <= Date.now());

  const readString = (key) => {
    const entry = strings.get(key);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      strings.delete(key);
      return undefined;
    }
    return entry;
  };

  const readSet = (key) => {
    const entry = sets.get(key);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      sets.delete(key);
      return undefined;
    }
    return entry;
  };

  const readList = (key) => {
    const entry = lists.get(key);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      lists.delete(key);
      return undefined;
    }
    return entry;
  };

  const setExpiry = (key, seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const expiresAt = Date.now() + seconds * 1000;
    const stringEntry = strings.get(key);
    if (stringEntry) stringEntry.expiresAt = expiresAt;
    const setEntry = sets.get(key);
    if (setEntry) setEntry.expiresAt = expiresAt;
    const listEntry = lists.get(key);
    if (listEntry) listEntry.expiresAt = expiresAt;
  };

  return {
    isOpen: true,

    async connect() {
      return undefined;
    },

    async quit() {
      this.isOpen = false;
    },

    async disconnect() {
      this.isOpen = false;
    },

    duplicate() {
      return getRedisClient();
    },

    on() {
      return this;
    },

    async get(key) {
      return readString(key)?.value ?? null;
    },

    async set(key, value, options = {}) {
      strings.set(key, { value: String(value), expiresAt: null });
      if (options && options.EX) setExpiry(key, options.EX);
      return "OK";
    },

    async setEx(key, seconds, value) {
      strings.set(key, { value: String(value), expiresAt: null });
      setExpiry(key, seconds);
      return "OK";
    },

    async del(key) {
      let removed = 0;
      if (strings.delete(key)) removed += 1;
      if (sets.delete(key)) removed += 1;
      if (lists.delete(key)) removed += 1;
      return removed;
    },

    async exists(key) {
      return readString(key) || readSet(key) || readList(key) ? 1 : 0;
    },

    async expire(key, seconds) {
      if (!readString(key) && !readSet(key) && !readList(key)) return 0;
      setExpiry(key, seconds);
      return 1;
    },

    async sAdd(key, member) {
      const entry = readSet(key) || { members: new Set(), expiresAt: null };
      if (entry.members.has(member)) {
        sets.set(key, entry);
        return 0;
      }
      entry.members.add(member);
      sets.set(key, entry);
      return 1;
    },

    async sRem(key, member) {
      const entry = readSet(key);
      if (!entry || !entry.members.has(member)) return 0;
      entry.members.delete(member);
      if (entry.members.size === 0) sets.delete(key);
      return 1;
    },

    async sMembers(key) {
      const entry = readSet(key);
      return entry ? Array.from(entry.members) : [];
    },

    async sIsMember(key, member) {
      const entry = readSet(key);
      return entry && entry.members.has(member) ? 1 : 0;
    },

    async incr(key) {
      const entry = readString(key);
      const next = entry ? Number(entry.value) + 1 : 1;
      strings.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
      return next;
    },

    async lPush(key, value) {
      const entry = readList(key) || { items: [], expiresAt: null };
      entry.items.unshift(String(value));
      lists.set(key, entry);
      return entry.items.length;
    },

    async lTrim(key, start, stop) {
      const entry = readList(key);
      if (!entry) return "OK";
      const length = entry.items.length;
      const from = start < 0 ? Math.max(length + start, 0) : start;
      const to = stop < 0 ? length + stop : stop;
      entry.items = entry.items.slice(from, to + 1);
      if (entry.items.length === 0) lists.delete(key);
      return "OK";
    },

    async lRange(key, start, stop) {
      const entry = readList(key);
      if (!entry) return [];
      const length = entry.items.length;
      const from = start < 0 ? Math.max(length + start, 0) : start;
      const to = stop < 0 ? length + stop : stop;
      return entry.items.slice(from, to + 1);
    },

    async lLen(key) {
      const entry = readList(key);
      return entry ? entry.items.length : 0;
    },

    async scan() {
      // The memory store has no key scanning; callers fall back to their
      // in-process maps, so report an empty keyspace.
      return ["0", []];
    },
  };
};

const memoryStore = createMemoryStore();

// ============================================================================
// Upstash REST client
// ----------------------------------------------------------------------------
// Upstash exposes an HTTP API: POST the command as a JSON array to the base
// URL and read `result` from the response.
// ============================================================================

const createUpstashClient = () => {
  let closed = false;

  const request = async (command, ...args) => {
    if (closed) {
      throw new Error("Upstash client is closed");
    }

    const response = await fetch(env.redis.upstashUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.redis.upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([String(command).toUpperCase(), ...args.map(String)]),
    });

    if (!response.ok) {
      throw new Error(`Upstash ${String(command).toUpperCase()} failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.error) {
      throw new Error(data.error);
    }
    return data ? data.result : null;
  };

  const safely = async (fallback, command, ...args) => {
    try {
      const result = await request(command, ...args);
      return result === undefined ? fallback : result;
    } catch (error) {
      logger.error(`Redis ${String(command).toUpperCase()} error`, { error: error.message });
      return fallback;
    }
  };

  return {
    isOpen: true,
    request,

    async connect() {
      return undefined;
    },

    async quit() {
      closed = true;
      this.isOpen = false;
    },

    async disconnect() {
      closed = true;
      this.isOpen = false;
    },

    duplicate() {
      return this;
    },

    on() {
      return this;
    },

    async ping() {
      return safely("PONG", "ping");
    },

    async get(key) {
      const result = await safely(null, "get", key);
      return result === null || result === undefined ? null : String(result);
    },

    async set(key, value, options = {}) {
      const args = [key, value];
      if (options && options.EX) args.push("EX", options.EX);
      return safely(null, "set", ...args);
    },

    async setEx(key, seconds, value) {
      return safely(null, "set", key, value, "EX", seconds);
    },

    async del(key) {
      const result = await safely(0, "del", key);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async exists(key) {
      const result = await safely(0, "exists", key);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async expire(key, seconds) {
      const result = await safely(0, "expire", key, seconds);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async sAdd(key, member) {
      const result = await safely(0, "sadd", key, member);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async sRem(key, member) {
      const result = await safely(0, "srem", key, member);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async sMembers(key) {
      const result = await safely(null, "smembers", key);
      return Array.isArray(result) ? result.map(String) : [];
    },

    async sIsMember(key, member) {
      const result = await safely(0, "sismember", key, member);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async incr(key) {
      const result = await safely(0, "incr", key);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async lPush(key, value) {
      const result = await safely(0, "lpush", key, value);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async lTrim(key, start, stop) {
      return safely("OK", "ltrim", key, start, stop);
    },

    async lRange(key, start, stop) {
      const result = await safely(null, "lrange", key, start, stop);
      return Array.isArray(result) ? result.map(String) : [];
    },

    async lLen(key) {
      const result = await safely(0, "llen", key);
      return typeof result === "number" ? result : Number(result) || 0;
    },

    async scan() {
      // The REST API cannot SCAN cheaply; report an empty keyspace so callers
      // fall back to their in-process presence map.
      return ["0", []];
    },
  };
};

let upstashClient = null;

const getUpstashClient = () => {
  if (!upstashClient && isUpstashConfigured()) {
    upstashClient = createUpstashClient();
  }
  return upstashClient;
};

// ============================================================================
// Connection lifecycle
// ============================================================================

const logClientError = (error) => {
  errorLogCount += 1;
  const message = error?.message || String(error) || "unknown error";
  if (errorLogCount <= MAX_ERROR_LOGS) {
    logger.warn("Redis client error", { error: message, attempt: errorLogCount });
  } else {
    logger.debug("Redis client error (suppressed)", { error: message });
  }
};

const connectRedis = async () => {
  if (!isRedisEnabled()) {
    logger.info("Redis disabled - using in-memory fallback");
    return;
  }

  if (!env.redis.useLocal && isUpstashConfigured()) {
    const client = getUpstashClient();
    const pong = client ? await client.ping() : null;
    if (pong) {
      isConnected = true;
      logger.info("Redis connected (Upstash)");
    } else {
      isConnected = false;
      logger.warn("Upstash Redis unreachable - using in-memory fallback");
    }
    return;
  }

  if (!env.redis.url) {
    isConnected = false;
    logger.warn("No REDIS_URL configured - using in-memory fallback");
    return;
  }

  try {
    redisClient = createClient({
      url: env.redis.url,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        // Give up instead of retrying forever so the HTTP server can start.
        reconnectStrategy: (retries) =>
          retries >= MAX_RECONNECT_ATTEMPTS ? false : Math.min(100 * 2 ** retries, 1000),
      },
    });

    redisClient.on("error", logClientError);

    redisClient.on("connect", () => {
      isConnected = true;
      errorLogCount = 0;
      logger.info("Redis connected (local)");
    });

    redisClient.on("end", () => {
      isConnected = false;
      logger.info("Redis disconnected");
    });

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    isConnected = true;
  } catch (error) {
    isConnected = false;
    logger.warn("Redis connection failed - using in-memory fallback", {
      url: env.redis.url,
      error: error?.message || String(error) || "connection refused",
    });

    if (redisClient) {
      try {
        await redisClient.disconnect();
      } catch {}
    }
    redisClient = null;
  }
};

const disconnectRedis = async () => {
  if (redisClient?.isOpen) {
    try {
      await redisClient.quit();
    } catch (error) {
      logger.debug("Redis quit failed", { error: error?.message || String(error) });
    }
  }
  redisClient = null;
  isConnected = false;
};

const isRedisConnected = () => isConnected;

/**
 * Returns the active Redis client, or an in-memory implementation when Redis
 * is disabled/unreachable. Callers that must know whether they are talking to
 * a shared Redis instance should check `isRedisConnected()` first.
 */
const getRedisClient = () => {
  if (!isRedisEnabled()) {
    return memoryStore;
  }

  if (!env.redis.useLocal && isUpstashConfigured()) {
    return getUpstashClient() || memoryStore;
  }

  return redisClient || memoryStore;
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};
