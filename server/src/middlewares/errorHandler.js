const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
    });
  }

  logger.error("Unhandled error", { error: error.message, stack: error.stack });

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

module.exports = errorHandler;
