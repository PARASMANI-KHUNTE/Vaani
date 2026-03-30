const Filter = require("bad-words");
const ApiError = require("./apiError");

const filter = new Filter();

const spamPattern = /(.)\1{7,}/;
const suspiciousLinkPattern =
  /(bit\.ly|tinyurl\.com|t\.co|rb\.gy|grabify|iplogger|discord\.gift|free-nitro)/i;

const assertSafeMessageContent = (content) => {
  const normalizedContent = content.trim();

  if (normalizedContent.length === 0) {
    throw new ApiError(400, "Message content cannot be empty");
  }

  if (spamPattern.test(normalizedContent)) {
    throw new ApiError(422, "Message looks like spam");
  }

  if (suspiciousLinkPattern.test(normalizedContent)) {
    throw new ApiError(422, "Message contains a suspicious link");
  }

  if (filter.isProfane(normalizedContent)) {
    throw new ApiError(422, "Message contains unsafe language");
  }

  return normalizedContent;
};

module.exports = {
  assertSafeMessageContent,
};
