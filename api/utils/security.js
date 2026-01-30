/**
 * Security Utilities for API Endpoints
 */

/**
 * Validate CSRF token
 * Note: For production, implement proper CSRF protection with tokens
 */
function validateCSRF(req) {
  const origin = req.headers.origin || req.headers.referer;
  const allowedHosts = [
    'www.epcla.com',
    'epcla.com',
    'localhost',
    '127.0.0.1'
  ];
  // Vercel preview and production
  const allowVercel = (host) => host.endsWith('.vercel.app') || host === 'vercel.app';

  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const host = originUrl.hostname.toLowerCase();
    if (allowedHosts.some(h => host === h || host.endsWith('.' + h))) return true;
    if (allowVercel(host)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Sanitize error message for client
 */
function sanitizeError(error, isProduction = process.env.NODE_ENV === 'production') {
  if (isProduction) {
    // In production, don't expose internal errors
    if (error.message && error.message.includes('environment variables')) {
      return { error: 'Server configuration error. Please contact support.' };
    }
    if (error.message && error.message.includes('Airtable')) {
      return { error: 'Failed to save data. Please try again.' };
    }
    return { error: 'An error occurred. Please try again later.' };
  }
  
  // In development, show more details
  return { error: error.message || 'An error occurred' };
}

/**
 * Standard error response
 */
function errorResponse(res, statusCode, message, details = null) {
  const response = { error: message };
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

/**
 * Success response
 */
function successResponse(res, data = { success: true }, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export {
  validateCSRF,
  sanitizeError,
  errorResponse,
  successResponse
};
