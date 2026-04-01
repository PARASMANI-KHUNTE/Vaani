const multer = require("multer");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const MAGIC_BYTES = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xe2],
    [0xff, 0xd8, 0xff, 0xdb],
    [0xff, 0xd8, 0xff, 0xee],
  ],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "video/mp4": [[0x66, 0x74, 0x79, 0x70]],
  "video/webm": [[0x1a, 0x45, 0xdf, 0xa3]],
  "audio/webm": [[0x1a, 0x45, 0xdf, 0xa3]],
  "audio/mpeg": [[0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

const getAllowedExtensions = {
  image: ["jpg", "jpeg", "png", "webp", "gif"],
  video: ["mp4", "webm", "mov", "ogg"],
  audio: ["webm", "mp3", "wav", "m4a", "ogg"],
  raw: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z", "txt", "csv"],
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "audio/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "text/plain",
  "text/csv",
]);

const checkMagicBytes = (buffer, expectedMimeType) => {
  const magicBytesPatterns = MAGIC_BYTES[expectedMimeType];
  if (!magicBytesPatterns) {
    return true;
  }

  for (const pattern of magicBytesPatterns) {
    let match = true;
    for (let i = 0; i < pattern.length; i++) {
      if (buffer[i] !== pattern[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (expectedMimeType === "image/webp" || expectedMimeType === "audio/wav") {
        if (expectedMimeType === "image/webp" && buffer.slice(0, 4).toString("hex") !== "52494646") {
          match = false;
        } else if (expectedMimeType === "audio/wav" && buffer.slice(8, 12).toString("ascii") !== "WAVE") {
          match = false;
        }
      }
      if (match) return true;
    }
  }
  return false;
};

const validateContentType = async (buffer, declaredMimeType, originalName) => {
  const declaredMimeLower = declaredMimeType.toLowerCase();
  const allowedExtension = originalName.split(".").pop()?.toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(declaredMimeLower)) {
    throw new ApiError(415, `File type ${declaredMimeLower} is not allowed`);
  }

  if (!checkMagicBytes(buffer, declaredMimeLower)) {
    throw new ApiError(415, "File content does not match declared file type");
  }

  return true;
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = Array.from(ALLOWED_MIME_TYPES);
    const allowedExts = Object.values(getAllowedExtensions).flat();
    const fileExt = file.originalname.split(".").pop()?.toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      logger.warn("Upload rejected: invalid MIME type", { mimetype: file.mimetype });
      return cb(new ApiError(415, `File type ${file.mimetype} is not allowed`), false);
    }

    if (fileExt && !allowedExts.includes(fileExt)) {
      logger.warn("Upload rejected: invalid file extension", { extension: fileExt });
      return cb(new ApiError(415, `File extension .${fileExt} is not allowed`), false);
    }

    cb(null, true);
  },
});

const singleMessageMediaUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, async (error) => {
    if (!error && req.file) {
      try {
        await validateContentType(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      } catch (validationError) {
        return next(validationError);
      }
    }

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
  validateContentType,
  ALLOWED_MIME_TYPES,
};
