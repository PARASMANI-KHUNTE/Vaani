const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /data:/gi,
  /vbscript:/gi,
];

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export const escapeHtml = (text: string): string => {
  if (!text) return "";
  return text.replace(/[&<>"'`=/]/g, (char) => ESCAPE_MAP[char] || char);
};

export const escapeHtmlAttr = (text: string): string => {
  if (!text) return "";
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return "";

  let sanitized = html;

  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  sanitized = sanitized.replace(/javascript\s*:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, (match) => match.charAt(0) + "safe-" + match.slice(3));

  return sanitized;
};

export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const trimmed = url.trim().toLowerCase();

  const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

  try {
    const parsed = new URL(trimmed);
    if (allowedProtocols.includes(parsed.protocol)) {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
};

export const stripAllHtml = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

export const isUrlSafe = (url: string): boolean => {
  if (!url) return false;

  const trimmed = url.trim().toLowerCase();

  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};
