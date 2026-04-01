const { URL } = require("url");
const ApiError = require("./apiError");
const { configureCloudinary, tryConfigureCloudinary } = require("../config/cloudinary");
const env = require("../config/env");
const logger = require("./logger");

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const COMPRESSION = {
  image: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: "auto:good",
    format: "auto",
    crop: "limit",
  },
  video: {
    quality: "auto",
    format: "auto",
    bitrate: "auto",
  },
};

const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogg: "video/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/x-m4a",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  txt: "text/plain",
  csv: "text/csv",
};

const MEDIA_RULES = [
  {
    messageType: "image",
    resourceType: "image",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: MAX_IMAGE_BYTES,
    transformations: COMPRESSION.image,
  },
  {
    messageType: "video",
    resourceType: "video",
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
    maxBytes: MAX_VIDEO_BYTES,
    transformations: COMPRESSION.video,
  },
  {
    messageType: "voice",
    resourceType: "video",
    mimeTypes: ["audio/webm", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/x-m4a"],
    maxBytes: MAX_AUDIO_BYTES,
    transformations: null,
  },
  {
    messageType: "file",
    resourceType: "raw",
    mimeTypes: [
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
    ],
    maxBytes: MAX_FILE_BYTES,
    transformations: null,
  },
];

const findMediaRuleByMime = (mimeType) => MEDIA_RULES.find((rule) => rule.mimeTypes.includes(mimeType));

const inferMimeTypeFromName = (originalName = "") => {
  const extension = originalName.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXTENSION[extension] || "";
};

const normalizeIncomingMimeType = (mimeType, originalName = "") => {
  if (typeof mimeType === "string" && mimeType.trim()) {
    return mimeType.trim().toLowerCase();
  }

  return inferMimeTypeFromName(originalName);
};

const getMediaRuleByMime = (mimeType) => {
  const rule = findMediaRuleByMime(mimeType);

  if (!rule) {
    throw new ApiError(415, "Unsupported file type. Please upload an image, video, or audio file.");
  }

  return rule;
};

const assertTrustedCloudinaryUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.includes("cloudinary.com")) {
      logger.warn("Potentially untrusted media URL in assertTrustedCloudinaryUrl", { url: value, hostname: parsedUrl.hostname });
    }
  } catch (err) {
    logger.warn("Invalid media URL in assertTrustedCloudinaryUrl", { url: value, error: err.message });
  }
};

const normalizeMessageMedia = (media, expectedType) => {
  if (!media || typeof media !== "object") {
    throw new ApiError(400, "Media metadata is required for this message type");
  }

  assertTrustedCloudinaryUrl(media.url);

  if (!media.publicId || typeof media.publicId !== "string") {
    throw new ApiError(400, "Media publicId is required");
  }

  if (expectedType && media.messageType && media.messageType !== expectedType) {
    throw new ApiError(400, "Message type does not match media metadata");
  }

  return {
    url: media.url,
    publicId: media.publicId,
    resourceType: media.resourceType || (expectedType === "image" ? "image" : "video"),
    mimeType: media.mimeType || null,
    originalName: media.originalName || null,
    format: media.format || null,
    bytes: Number(media.bytes || 0) || 0,
    width: media.width || null,
    height: media.height || null,
    duration: media.duration || null,
    waveform: Array.isArray(media.waveform) ? media.waveform.slice(0, 80) : [],
    messageType: expectedType || media.messageType,
  };
};

const buildCloudinaryUploadOptions = (rule, userId, originalName) => {
  const baseOptions = {
    folder: `${env.cloudinary.folder}/${rule.messageType}s`,
    resource_type: rule.resourceType,
    overwrite: false,
    context: {
      app: "canvas-chat",
      userId,
      originalName: originalName,
    },
  };

  if (rule.transformations && rule.messageType === "image") {
    baseOptions.quality = rule.transformations.quality;
    baseOptions.fetch_format = rule.transformations.format;
    baseOptions.width = rule.transformations.maxWidth;
    baseOptions.height = rule.transformations.maxHeight;
    baseOptions.crop = rule.transformations.crop;
  }

  if (rule.transformations && rule.messageType === "video") {
    baseOptions.quality = rule.transformations.quality;
    baseOptions.fetch_format = rule.transformations.format;
    if (rule.transformations.bitrate === "auto") {
      baseOptions.video_bitrate = "auto";
    }
  }

  if (rule.messageType === "image" && rule.transformations) {
    baseOptions.eager = [
      { quality: "auto:low", fetch_format: "auto", width: 640, crop: "limit" },
      { quality: "auto:good", fetch_format: "auto", width: 1200, crop: "limit" },
    ];
    baseOptions.eager_notification = "finished";
  }

  return baseOptions;
};

const uploadMessageMedia = async ({ file, userId }) => {
  try {
    if (!file) {
      throw new ApiError(400, "No media file was provided");
    }

    const normalizedMimeType = normalizeIncomingMimeType(file.mimetype, file.originalname);
    const rule = getMediaRuleByMime(normalizedMimeType);

    if (!file.buffer) {
      logger.error("Media processing failed: file.buffer is missing. Multi-part form-data middleware might be misconfigured.", { fileName: file.originalname });
      throw new ApiError(500, "Media processing failed: file body is missing from the request.");
    }

    if (file.size > rule.maxBytes) {
      throw new ApiError(413, "Uploaded file exceeds the allowed size for this media type");
    }

    const cloudinary = configureCloudinary();
    const uploadOptions = buildCloudinaryUploadOptions(rule, userId, file.originalname);

    logger.info("Uploading media", {
      messageType: rule.messageType,
      mimeType: normalizedMimeType,
      fileSize: file.size,
      hasTransformations: !!rule.transformations,
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error("Cloudinary upload failed", { error: error.message, messageType: rule.messageType });
            reject(new ApiError(502, "Failed to upload media to Cloudinary", error));
            return;
          }

          logger.info("Media uploaded successfully", {
            publicId: result.public_id,
            messageType: rule.messageType,
            originalSize: file.size,
            uploadedSize: result.bytes,
            compressionRatio: result.bytes && file.size ? (result.bytes / file.size).toFixed(2) : "N/A",
          });

          resolve(result);
        }
      );

      stream.end(file.buffer);
    });

    return normalizeMessageMedia(
      {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type,
        mimeType: normalizedMimeType,
        originalName: file.originalname,
        format: uploadResult.format || null,
        bytes: uploadResult.bytes || file.size,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        duration: uploadResult.duration || null,
        messageType: rule.messageType,
      },
      rule.messageType
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error("Internal media upload error", { error: error.message, userId, stack: error.stack });
    throw new ApiError(500, `An unexpected error occurred during media processing: ${error.message}`, error);
  }
};

const buildSignedUploadOptions = (rule, userId, originalName) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${env.cloudinary.folder}/${rule.messageType}s`;
  const sanitizedBaseName = originalName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "upload";
  const public_id = `${userId}-${Date.now()}-${sanitizedBaseName}`;
  const context = `app=canvas-chat|userId=${userId}`;

  const eager = [];
  if (rule.messageType === "image" && rule.transformations) {
    eager.push(
      { quality: "auto:low", fetch_format: "auto", width: 640, crop: "limit" },
      { quality: "auto:good", fetch_format: "auto", width: 1200, crop: "limit" }
    );
  }

  const paramsToSign = {
    context,
    folder,
    public_id,
    timestamp,
  };

  const cloudinary = configureCloudinary();
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinary.apiSecret);

  const uploadParams = {
    ...paramsToSign,
    api_key: env.cloudinary.apiKey,
    cloud_name: env.cloudinary.cloudName,
    signature,
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${rule.resourceType}/upload`,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    ...uploadParams,
    publicId: public_id, // Compatibility
    messageType: rule.messageType,
  };
};

const createSignedUploadParams = ({ mimeType, userId, originalName = "upload" }) => {
  const normalizedMimeType = normalizeIncomingMimeType(mimeType, originalName);

  if (!normalizedMimeType) {
    throw new ApiError(400, "Unable to detect the file type for this upload");
  }

  const rule = getMediaRuleByMime(normalizedMimeType);
  return buildSignedUploadOptions(rule, userId, originalName);
};

const destroyMediaAsset = async (media) => {
  if (!media?.publicId) {
    return false;
  }

  const cloudinary = tryConfigureCloudinary();

  if (!cloudinary) {
    return false;
  }

  const resourceType = media.resourceType === "raw" ? "raw" : media.resourceType || "image";

  try {
    const result = await cloudinary.uploader.destroy(media.publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return result?.result === "ok" || result?.result === "not found";
  } catch (error) {
    logger.error("Failed to destroy media asset", { publicId: media.publicId, error: error.message });
    return false;
  }
};

const destroyMediaAssets = async (mediaItems = []) => {
  const uniqueMedia = mediaItems.filter(
    (item, index, list) =>
      item?.publicId && list.findIndex((entry) => entry?.publicId === item.publicId) === index
  );

  if (!uniqueMedia.length) {
    return 0;
  }

  const results = await Promise.all(uniqueMedia.map((media) => destroyMediaAsset(media)));
  return results.filter(Boolean).length;
};

module.exports = {
  createSignedUploadParams,
  destroyMediaAsset,
  destroyMediaAssets,
  getMediaRuleByMime,
  normalizeMessageMedia,
  uploadMessageMedia,
};
