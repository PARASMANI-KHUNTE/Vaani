const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const { sendSuccess } = require("./utils/apiResponse");
const ApiError = require("./utils/apiError");
const logger = require("./utils/logger");
const { getConnection } = require("./config/database");
const { isRedisConnected } = require("./config/redis.client");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const authRoutes = require("./modules/auth/auth.routes");
const chatRoutes = require("./modules/chat/chat.routes");
const messageRoutes = require("./modules/message/message.routes");
const userRoutes = require("./modules/user/user.routes");

const allowedOrigins = [...env.clientUrls, ...env.mobileOrigins].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const app = express();

app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);

app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    logger.warn("Request timeout", { path: req.path, method: req.method, ip: req.ip });
  });
  next();
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const getHealthSnapshot = () => {
  const mongoState = getConnection()?.readyState ?? 0;
  const mongoConnected = mongoState === 1;
  const redisEnabled = Boolean(env.redis.enabled);

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    env: env.nodeEnv,
    mongo: {
      connected: mongoConnected,
      readyState: mongoState,
    },
    redis: {
      enabled: redisEnabled,
      connected: redisEnabled ? isRedisConnected() : false,
      mode: env.redis.useLocal ? "local" : env.redis.upstashUrl ? "upstash" : "disabled",
      url: env.redis.url,
    },
  };
};

app.get("/", (_req, res) => {
  return sendSuccess(res, 200, "OK", {
    service: "canvas-chat",
    endpoints: {
      health: "/health",
      readiness: "/readyz",
    },
    ...getHealthSnapshot(),
  });
});

app.get("/health", (_req, res) => {
  return sendSuccess(res, 200, "Server is healthy", getHealthSnapshot());
});

app.get("/monitoring/health", (_req, res) => {
  return sendSuccess(res, 200, "Server is healthy", getHealthSnapshot());
});

app.post("/monitoring/send", (req, res, next) => {
  try {
    const { level, message, meta, type } = req.body ?? {};

    if (!message || typeof message !== "string") {
      throw new ApiError(400, "message is required");
    }

    const normalizedLevel = typeof level === "string" ? level.toLowerCase() : "info";
    const logFn = logger[normalizedLevel] || logger.info;

    logFn(message, {
      type: typeof type === "string" ? type : "client",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      ...(meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}),
    });

    return sendSuccess(res, 200, "Monitoring event received", {
      received: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});
app.get("/readyz", (_req, res) => {
  const snapshot = getHealthSnapshot();
  const ready = snapshot.mongo.connected && (!snapshot.redis.enabled || snapshot.redis.connected);
  const status = ready ? 200 : 503;

  return res.status(status).json({
    success: ready,
    status,
    message: ready ? "Ready" : "Not ready",
    data: snapshot,
  });
});

app.get("/monitoring/ready", (_req, res) => {
  const snapshot = getHealthSnapshot();
  const ready = snapshot.mongo.connected && (!snapshot.redis.enabled || snapshot.redis.connected);
  const status = ready ? 200 : 503;

  return res.status(status).json({
    success: ready,
    status,
    message: ready ? "Ready" : "Not ready",
    data: snapshot,
  });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/chats", chatRoutes);
app.use("/messages", messageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
