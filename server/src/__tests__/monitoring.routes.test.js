const http = require("http");

const startServer = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });

const stopServer = (server) =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

const requestJson = (url, { method = "GET", headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);

    const req = http.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          connection: "close",
          ...headers,
        },
        agent: false,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode,
            json: text ? JSON.parse(text) : null,
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

describe("Monitoring routes", () => {
  const buildApp = async () => {
    jest.resetModules();

    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    jest.doMock("../config/env", () => ({
      nodeEnv: "test",
      clientUrls: ["http://localhost:5173"],
      mobileOrigins: [],
      redis: {
        enabled: false,
        useLocal: true,
        upstashUrl: null,
        url: "redis://localhost:6379",
      },
    }));

    jest.doMock("../config/database", () => ({
      getConnection: () => ({ readyState: 1 }),
    }));

    jest.doMock("../config/redis.client", () => ({
      isRedisConnected: () => true,
    }));

    jest.doMock("../utils/logger", () => logger);

    const app = require("../app");
    return { app, logger };
  };

  it("GET / returns service info (200)", async () => {
    const { app } = await buildApp();
    const { server, baseUrl } = await startServer(app);

    try {
      const { status, json: body } = await requestJson(`${baseUrl}/`);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("OK");
      expect(body.data.service).toBe("canvas-chat");
    } finally {
      await stopServer(server);
    }
  });

  it("GET /monitoring/health returns health snapshot (200)", async () => {
    const { app } = await buildApp();
    const { server, baseUrl } = await startServer(app);

    try {
      const { status, json: body } = await requestJson(`${baseUrl}/monitoring/health`);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Server is healthy");
      expect(body.data.mongo.connected).toBe(true);
    } finally {
      await stopServer(server);
    }
  });

  it("POST /monitoring/send accepts client event (200)", async () => {
    const { app, logger } = await buildApp();
    const { server, baseUrl } = await startServer(app);

    try {
      const payload = JSON.stringify({
        level: "info",
        type: "ui",
        message: "client error reported",
        meta: { feature: "chat" },
      });

      const { status, json: body } = await requestJson(`${baseUrl}/monitoring/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        body: payload,
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Monitoring event received");
      expect(logger.info).toHaveBeenCalledTimes(1);
    } finally {
      await stopServer(server);
    }
  });
});
