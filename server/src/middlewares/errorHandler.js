const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const ERROR_MESSAGES = {
  400: {
    default: "Invalid request. Please check your input and try again.",
    MISSING_FIELD: "Required field is missing",
    INVALID_ID: "Invalid ID format",
    INVALID_CONTENT: "Message content is invalid",
    INVALID_TYPE: "Invalid message type",
  },
  401: {
    default: "Authentication required. Please log in.",
    INVALID_TOKEN: "Session expired. Please log in again.",
    TOKEN_EXPIRED: "Session expired. Please log in again.",
    NO_TOKEN: "Please log in to continue.",
  },
  403: {
    default: "You don't have permission to perform this action.",
    ACCOUNT_DISABLED: "Your account is disabled. Please contact support.",
    BLOCKED: "Unable to interact with this user.",
    UNAUTHORIZED: "You are not authorized to perform this action.",
  },
  404: {
    default: "The requested resource was not found.",
    CHAT_NOT_FOUND: "Chat not found or you don't have access.",
    USER_NOT_FOUND: "User not found.",
    MESSAGE_NOT_FOUND: "Message not found.",
  },
  409: {
    default: "A conflict occurred. Please try again.",
    ALREADY_EXISTS: "This item already exists.",
    ALREADY_FRIENDS: "You are already friends with this user.",
    REQUEST_EXISTS: "Friend request already sent.",
  },
  413: {
    default: "File is too large. Please use a smaller file.",
    IMAGE_TOO_LARGE: "Image exceeds the 12MB limit.",
    VIDEO_TOO_LARGE: "Video exceeds the 50MB limit.",
    FILE_TOO_LARGE: "File exceeds the 25MB limit.",
  },
  415: {
    default: "File type not supported.",
    UNSUPPORTED_MEDIA: "This file type is not allowed.",
  },
  422: {
    default: "Validation failed. Please check your input.",
  },
  429: {
    default: "Too many requests. Please slow down.",
    UPLOAD_LIMIT: "Upload limit reached. Please wait before uploading again.",
    MESSAGE_LIMIT: "Message limit reached. Please slow down.",
    RATE_LIMIT: "Too many attempts. Please try again later.",
  },
  500: {
    default: "Something went wrong. Please try again later.",
    INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
  },
  502: {
    default: "Service temporarily unavailable. Please try again.",
    UPLOAD_FAILED: "Failed to upload file. Please try again.",
  },
  503: {
    default: "Service is temporarily unavailable. Please try again later.",
  },
};

const getErrorMessage = (statusCode, error) => {
  if (error.message && !ERROR_MESSAGES[statusCode]?.default.includes("Please")) {
    return error.message;
  }

  const statusMessages = ERROR_MESSAGES[statusCode];
  if (!statusMessages) {
    return ERROR_MESSAGES[500].default;
  }

  if (error.name === "ValidationError" && statusCode === 400) {
    return statusMessages.INVALID_CONTENT || error.message;
  }

  if (error.name === "TokenExpiredError") {
    return statusMessages.TOKEN_EXPIRED || ERROR_MESSAGES[401].TOKEN_EXPIRED;
  }

  if (error.name === "JsonWebTokenError") {
    return statusMessages.INVALID_TOKEN || ERROR_MESSAGES[401].INVALID_TOKEN;
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "Item";
    return `${field} already exists`;
  }

  return error.message || statusMessages.default || ERROR_MESSAGES[500].default;
};

const isOperationalError = (error) => {
  if (error instanceof ApiError) {
    return error.statusCode < 500;
  }

  const operationalErrors = [
    "ValidationError",
    "CastError",
    "TokenExpiredError",
    "JsonWebTokenError",
  ];

  if (operationalErrors.includes(error.name)) {
    return true;
  }

  if (error.code === 11000) {
    return true;
  }

  return false;
};

const errorHandler = (err, req, res, next) => {
  let error = err;
  let statusCode = 500;
  let message = ERROR_MESSAGES[500].default;
  let details = null;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = getErrorMessage(statusCode, error);
    details = error.details;
  } else {
    statusCode = error.statusCode || error.status || 500;
    message = getErrorMessage(statusCode, error);

    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyPattern || {})[0] || "Field";
      message = `${field} already exists`;
    } else if (error.name === "ValidationError") {
      statusCode = 400;
      if (error.errors) {
        message = Object.values(error.errors)
          .map((val) => val.message)
          .join(", ");
      }
    } else if (error.name === "CastError") {
      statusCode = 400;
      message = "Invalid ID format provided";
    } else if (error.name === "TokenExpiredError") {
      statusCode = 401;
      message = ERROR_MESSAGES[401].TOKEN_EXPIRED;
    } else if (error.name === "JsonWebTokenError") {
      statusCode = 401;
      message = ERROR_MESSAGES[401].INVALID_TOKEN;
    } else if (error.message?.includes("E11000")) {
      statusCode = 409;
      message = "Duplicate entry. This item already exists.";
    }
  }

  const shouldLog = !isOperationalError(error) || statusCode >= 500;

  if (shouldLog) {
    const logData = {
      statusCode,
      message,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?._id?.toString(),
      ip: req.ip,
    };

    if (statusCode >= 500) {
      logger.error("Server Error", {
        ...logData,
        stack: error.stack,
        body: req.body && Object.keys(req.body).length > 0 ? "[BODY]" : undefined,
      });
    } else {
      logger.warn("Client Error", logData);
    }
  }

  if (statusCode >= 500 && !isOperationalError(error)) {
    message = ERROR_MESSAGES[500].INTERNAL_ERROR;
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      originalError: error.message,
    }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  isOperationalError,
};
