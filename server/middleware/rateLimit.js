import rateLimit from 'express-rate-limit';

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

const passthrough = (_req, _res, next) => next();

// Global rate limit: 100 requests per minute per user
// These routes are behind requireAuth, so req.userId is always set
export const globalLimiter = !RATE_LIMIT_ENABLED ? passthrough : rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.userId,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI/LLM endpoint rate limit: 10 requests per minute per user
export const aiLimiter = !RATE_LIMIT_ENABLED ? passthrough : rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.userId,
  message: { error: 'Too many AI requests, please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoint rate limit: 5 attempts per 15 minutes per IP
export const authLimiter = !RATE_LIMIT_ENABLED ? passthrough : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
