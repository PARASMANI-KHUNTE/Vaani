type MobileAuthCodeEntry = {
  accessToken: string;
  expiresAt: number;
};

const CODE_TTL_MS = 60 * 1000;
const mobileAuthCodes = new Map<string, MobileAuthCodeEntry>();

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

export const issueMobileAuthCode = (accessToken: string) => {
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

export const redeemMobileAuthCode = (code: string) => {
  clearExpiredCodes();

  const entry = mobileAuthCodes.get(code);
  if (!entry) {
    return null;
  }

  mobileAuthCodes.delete(code);
  return entry.accessToken;
};
