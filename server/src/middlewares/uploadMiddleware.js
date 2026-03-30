const multer = require("multer");
const ApiError = require("../utils/apiError");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024,
  },
});

const singleMessageMediaUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(413, "File is too large. Max upload size is 60MB."));
      }

      return next(new ApiError(400, error.message));
    }

    return next(error);
  });
};

module.exports = {
  singleMessageMediaUpload,
};
