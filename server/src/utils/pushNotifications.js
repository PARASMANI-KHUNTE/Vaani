const logger = require('./logger');

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

const isExpoPushToken = (token) =>
  typeof token === "string" && /^ExponentPushToken\[[A-Za-z0-9+\-_=]+\]$/.test(token);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt) => {
  const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  return delay + Math.random() * 1000;
};

const sendSinglePushWithRetry = async (message, attempt = 0) => {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify([message]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (attempt < MAX_RETRIES - 1) {
        const delay = calculateBackoff(attempt);
        logger.warn(`Push notification failed, retrying in ${Math.round(delay)}ms`, {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          status: response.status,
        });
        await sleep(delay);
        return sendSinglePushWithRetry(message, attempt + 1);
      }
      logger.error("Push notification failed after retries", {
        status: response.status,
        error: errorText,
        attempts: attempt + 1,
      });
      return { success: false, error: errorText, attempts: attempt + 1 };
    }

    const data = await response.json();
    if (data.data?.status === "error") {
      if (attempt < MAX_RETRIES - 1) {
        const delay = calculateBackoff(attempt);
        logger.warn(`Push notification error status, retrying in ${Math.round(delay)}ms`, {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
        });
        await sleep(delay);
        return sendSinglePushWithRetry(message, attempt + 1);
      }
      logger.error("Push notification error status after retries", {
        details: data.data.details,
        attempts: attempt + 1,
      });
      return { success: false, error: data.data.details, attempts: attempt + 1 };
    }

    return { success: true, data, attempts: attempt + 1 };
  } catch (error) {
    if (attempt < MAX_RETRIES - 1) {
      const delay = calculateBackoff(attempt);
      logger.warn(`Push notification error, retrying in ${Math.round(delay)}ms`, {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        error: error.message,
      });
      await sleep(delay);
      return sendSinglePushWithRetry(message, attempt + 1);
    }
    logger.error("Push notification failed after retries", {
      error: error.message,
      stack: error.stack,
      attempts: attempt + 1,
    });
    return { success: false, error: error.message, attempts: attempt + 1 };
  }
};

const sendExpoPushNotifications = async (messages) => {
  const safeMessages = (messages || []).filter((entry) => isExpoPushToken(entry.to));

  if (!safeMessages.length) {
    return;
  }

  const results = await Promise.allSettled(
    safeMessages.map((message) => sendSinglePushWithRetry(message))
  );

  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
  );

  if (failed.length > 0) {
    logger.warn(`${failed.length}/${safeMessages.length} push notifications failed after retries`);
  }
};

module.exports = {
  isExpoPushToken,
  sendExpoPushNotifications,
};
