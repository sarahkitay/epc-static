/**
 * Server-side Authentication Endpoint
 * Validates password and returns session token
 */

const { validateRequestBody, errorResponse, successResponse } = require('./utils/validation');
const { rateLimitMiddleware } = require('./utils/rate-limit');
const { validateCSRF, sanitizeError } = require('./utils/security');
const crypto = require('crypto');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  // Stricter rate limiting for login attempts
  if (!rateLimitMiddleware(req, res, 5, 60000)) {
    return;
  }

  // CSRF protection
  if (!validateCSRF(req)) {
    return errorResponse(res, 403, 'Invalid request origin');
  }

  try {
    // Validate input
    const validation = validateRequestBody(req.body, {
      password: { type: 'text', required: true },
      loginType: { type: 'text', required: false } // 'staff' or 'parent'
    });

    if (!validation.valid) {
      return errorResponse(res, 400, 'Validation failed', validation.errors);
    }

    const { password, loginType } = validation.sanitized;

    // Get password from environment variable (should be hashed in production)
    // For now, we'll use plain text comparison but recommend bcrypt
    const correctPassword = process.env.ADMIN_PASSWORD || '15125';
    
    // In production, use: const bcrypt = require('bcrypt');
    // const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    const isValid = password === correctPassword;

    if (!isValid) {
      return errorResponse(res, 401, 'Invalid password');
    }

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      token: sessionToken,
      type: loginType || 'staff',
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    return successResponse(res, sessionData);
  } catch (error) {
    console.error('Auth error:', error);
    return errorResponse(res, 500, 'Internal server error', sanitizeError(error));
  }
}
