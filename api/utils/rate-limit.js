/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter (for Vercel serverless)
 * For production, consider using Upstash Redis or Vercel Edge Config
 */

// In-memory store (resets on serverless function restart)
const rateLimitStore = new Map();

/**
 * Simple rate limiter
 * @param {string} identifier - IP address or user identifier
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, reset: number }
 */
function rateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  // Clean up old entries (older than window)
  for (const [k, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > windowMs) {
      rateLimitStore.delete(k);
    }
  }
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      reset: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      reset: now + windowMs
    };
  }
  
  // Check if window has expired
  if (now - record.firstRequest > windowMs) {
    // Reset window
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      reset: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      reset: now + windowMs
    };
  }
  
  // Increment count
  record.count++;
  
  if (record.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      reset: record.reset
    };
  }
  
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    reset: record.reset
  };
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(req) {
  // Try to get IP from various headers (Vercel sets these)
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

/**
 * Rate limit middleware
 */
function rateLimitMiddleware(req, res, maxRequests = 10, windowMs = 60000) {
  const identifier = getClientIdentifier(req);
  const result = rateLimit(identifier, maxRequests, windowMs);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.reset).toISOString());
  
  if (!result.allowed) {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    });
    return false;
  }
  
  return true;
}

module.exports = {
  rateLimit,
  getClientIdentifier,
  rateLimitMiddleware
};
