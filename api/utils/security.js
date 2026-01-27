/**
 * Security Utilities for API Endpoints
 */

/**
 * Validate CSRF token
 * Note: For production, implement proper CSRF protection with tokens
 */
function validateCSRF(req) {
  // For now, check Origin header
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = [
    'https://www.epcla.com',
    'https://epcla.com',
    'http://localhost:3000', // Development
    'http://localhost:3001'
  ];
  
  if (!origin) {
    // Allow requests without origin (e.g., Postman, curl) in development
    // In production, you might want to be stricter
    return true;
  }
  
  const originUrl = new URL(origin);
  return allowedOrigins.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      return originUrl.hostname === allowedUrl.hostname;
    } catch {
      return false;
    }
  });
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
