const CODE_TTL_MS = 60 * 1000;
const mobileAuthCodes = new Map();

const generateCode = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const clearExpiredCodes = () => {
  const now = Date.now();

  for (const [code, entry] of mobileAuthCodes.entries()) {
    if (entry.expiresAt <= now) {
      mobileAuthCodes.delete(code);
    }
  }
};

const issueMobileAuthCode = (accessToken) => {
  clearExpiredCodes();

  const code = generateCode();
  mobileAuthCodes.set(code, {
    accessToken,
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  return {
    code,
    ttlMs: CODE_TTL_MS,
  };
};

const redeemMobileAuthCode = (code) => {
  clearExpiredCodes();

  const entry = mobileAuthCodes.get(code);
  if (!entry) {
    return null;
  }

  mobileAuthCodes.delete(code);
  return entry.accessToken;
};

module.exports = {
  issueMobileAuthCode,
  redeemMobileAuthCode,
};
