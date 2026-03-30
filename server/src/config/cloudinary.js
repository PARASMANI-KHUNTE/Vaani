const { v2: cloudinary } = require("cloudinary");
const env = require("./env");
const ApiError = require("../utils/apiError");

let configured = false;

const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new ApiError(
      503,
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });

  configured = true;
  return cloudinary;
};

const tryConfigureCloudinary = () => {
  try {
    return configureCloudinary();
  } catch {
    return null;
  }
};

module.exports = {
  configureCloudinary,
  tryConfigureCloudinary,
};
