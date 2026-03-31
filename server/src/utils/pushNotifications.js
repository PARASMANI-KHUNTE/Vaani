const logger = require('./logger');

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const isExpoPushToken = (token) =>
  typeof token === "string" && /^ExponentPushToken\[[A-Za-z0-9+\-_=]+\]$/.test(token);

const sendExpoPushNotifications = async (messages) => {
  const safeMessages = (messages || []).filter((entry) => isExpoPushToken(entry.to));

  if (!safeMessages.length) {
    return;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safeMessages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Expo push send failed", { status: response.status, error: errorText });
    }
  } catch (error) {
    logger.error("Expo push send failed", { error: error.message, stack: error.stack });
  }
};

module.exports = {
  isExpoPushToken,
  sendExpoPushNotifications,
};
