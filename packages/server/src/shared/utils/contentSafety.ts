/**
 * Content Safety Utilities
 * Profanity filtering, spam detection, suspicious link blocking
 */

import { Patterns } from '@chat-app/shared/constants';
import { logger } from './logger';

// ============================================================================
// Profanity Filter
// ============================================================================

// Basic profanity list (extend as needed)
const PROFANITY_WORDS = new Set([
  // Add common profanity words here
  // This is a minimal list - consider using a library like 'bad-words' for production
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'cock',
  'motherfucker', 'fucker', 'shithead', 'asshat', 'douche', 'twat',
  'crap', 'damn', 'hell', 'piss', 'bastard', 'slut', 'whore', 'fag',
  'nigger', 'nigga', 'retard', 'spic', 'chink', 'gook', 'kike',
]);

const PROFANITY_REGEX = new RegExp(`\\b(${Array.from(PROFANITY_WORDS).join('|')})\\b`, 'gi');

export const containsProfanity = (text: string): boolean => {
  return PROFANITY_REGEX.test(text);
};

export const filterProfanity = (text: string, replacement: string = '***'): string => {
  return text.replace(PROFANITY_REGEX, replacement);
};

export const getProfanityMatches = (text: string): string[] => {
  const matches = text.match(PROFANITY_REGEX);
  return matches ? [...new Set(matches.map((m) => m.toLowerCase()))] : [];
};

// ============================================================================
// Spam Detection
// ============================================================================

interface SpamCheckResult {
  isSpam: boolean;
  reasons: string[];
  score: number;
}

const SPAM_PATTERNS = [
  // Repeated characters
  /(.)\1{10,}/,
  // Excessive caps
  /[A-Z]{20,}/,
  // Excessive punctuation
  /[!?]{5,}/,
  // Repeated words
  /\b(\w+)\s+\1\s+\1\s+\1\b/i,
  // Common spam phrases
  /\b(click here|buy now|free money|make money|work from home|limited time|act now)\b/i,
  // Excessive links
  /(https?:\/\/[^\s]+){3,}/,
];

const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations',
  'claim your prize', 'urgent', 'immediate action', 'verify account',
  'suspended', 'limited offer', 'exclusive deal', 'guaranteed',
];

export const checkSpam = (text: string): SpamCheckResult => {
  const reasons: string[] = [];
  let score = 0;

  // Check patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      score += 10;
      reasons.push(`Matched spam pattern: ${pattern.source}`);
    }
  }

  // Check keywords
  const lowerText = text.toLowerCase();
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 5;
      reasons.push(`Contains spam keyword: ${keyword}`);
    }
  }

  // Check length anomalies
  if (text.length > 5000) {
    score += 5;
    reasons.push('Message too long');
  }

  // Check for excessive repetition
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (words.length > 50 && uniqueWords.size / words.length < 0.3) {
    score += 15;
    reasons.push('High word repetition');
  }

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (capsRatio > 0.5 && text.length > 20) {
    score += 10;
    reasons.push('Excessive capitalization');
  }

  return {
    isSpam: score >= 20,
    reasons,
    score,
  };
};

// ============================================================================
// Suspicious Link Detection
// ============================================================================

const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'online',
  'site', 'website', 'space', 'tech', 'info', 'link', 'click',
]);

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.link', 'cutt.ly',
  'rb.gy', 'is.gd', 'v.gd', 'tiny.cc', 'clck.ru', 'ow.ly', 'buff.ly',
  'adf.ly', 'bc.vc', 'shorte.st', 'ouo.io', 'tiny.pl',
]);

const SUSPICIOUS_KEYWORDS_IN_URL = [
  'login', 'signin', 'verify', 'account', 'secure', 'update',
  'confirm', 'validate', 'authenticate', 'password', 'credential',
  'bank', 'paypal', 'apple', 'microsoft', 'google', 'amazon',
];

interface LinkCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  urls: string[];
}

export const checkSuspiciousLinks = (text: string): LinkCheckResult => {
  const reasons: string[] = [];
  const urls: string[] = [];

  // Extract URLs
  const urlMatches = text.match(Patterns.URL);
  if (urlMatches) {
    urls.push(...urlMatches);

    for (const url of urlMatches) {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Check for URL shorteners
        if (URL_SHORTENERS.has(hostname)) {
          reasons.push(`URL shortener detected: ${hostname}`);
        }

        // Check for suspicious TLDs
        const tld = hostname.split('.').pop();
        if (tld && SUSPICIOUS_TLDS.has(tld)) {
          reasons.push(`Suspicious TLD: .${tld}`);
        }

        // Check for suspicious keywords in URL
        for (const keyword of SUSPICIOUS_KEYWORDS_IN_URL) {
          if (url.toLowerCase().includes(keyword)) {
            reasons.push(`Suspicious keyword in URL: ${keyword}`);
            break;
          }
        }

        // Check for IP address instead of domain
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
          reasons.push('IP address used instead of domain');
        }

        // Check for excessive subdomains
        const subdomainCount = hostname.split('.').length - 2;
        if (subdomainCount > 3) {
          reasons.push(`Excessive subdomains (${subdomainCount})`);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  // Check for suspicious URL patterns in text
  if (Patterns.SUSPICIOUS_URL.test(text)) {
    reasons.push('Known suspicious URL pattern detected');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    urls: [...new Set(urls)],
  };
};

// ============================================================================
// Combined Content Safety Check
// ============================================================================

export interface ContentSafetyResult {
  safe: boolean;
  profanity: { detected: boolean; words: string[] };
  spam: SpamCheckResult;
  links: LinkCheckResult;
  filteredText: string;
}

export const checkContentSafety = (text: string): ContentSafetyResult => {
  const profanityWords = getProfanityMatches(text);
  const profanityDetected = profanityWords.length > 0;

  const spamResult = checkSpam(text);
  const linkResult = checkSuspiciousLinks(text);

  // Filter profanity
  let filteredText = text;
  if (profanityDetected) {
    filteredText = filterProfanity(text);
  }

  const safe = !profanityDetected && !spamResult.isSpam && !linkResult.isSuspicious;

  return {
    safe,
    profanity: {
      detected: profanityDetected,
      words: profanityWords,
    },
    spam: spamResult,
    links: linkResult,
    filteredText,
  };
};

// ============================================================================
// Rate Limiting for Content Checks (prevent abuse)
// ============================================================================

const contentCheckCache = new Map<string, { count: number; resetTime: number }>();

export const checkContentSafetyRateLimited = (
  text: string,
  userId: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; result?: ContentSafetyResult; remaining: number } => {
  const now = Date.now();
  const key = `${userId}:content-check`;
  const cached = contentCheckCache.get(key);

  if (cached && cached.resetTime > now) {
    if (cached.count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    cached.count++;
    const result = checkContentSafety(text);
    return { allowed: true, result, remaining: limit - cached.count };
  }

  // Reset or create new
  contentCheckCache.set(key, { count: 1, resetTime: now + windowMs });
  const result = checkContentSafety(text);
  return { allowed: true, result, remaining: limit - 1 };
};

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of contentCheckCache.entries()) {
    if (value.resetTime < now) {
      contentCheckCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes