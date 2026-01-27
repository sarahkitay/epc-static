/**
 * Server-side Input Validation Utilities
 * For use in API endpoints
 */

// Input length limits
const MAX_LENGTHS = {
  email: 254,
  phone: 20,
  name: 100,
  text: 10000,
  message: 5000,
  notes: 2000,
  subject: 200
};

// Validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  name: /^[a-zA-Z\s\-'\.]+$/,
  url: /^https?:\/\/.+/
};

/**
 * Validate and sanitize input
 */
function validateInput(value, type = 'text', required = false) {
  // Check if required
  if (required && (!value || typeof value !== 'string' || value.trim().length === 0)) {
    return { valid: false, error: 'This field is required' };
  }
  
  // Allow empty optional fields
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: true, sanitized: '' };
  }
  
  // Trim whitespace
  const trimmed = value.trim();
  
  // Check max length
  const maxLength = MAX_LENGTHS[type] || MAX_LENGTHS.text;
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Input exceeds maximum length of ${maxLength} characters` };
  }
  
  // Pattern validation
  if (PATTERNS[type] && !PATTERNS[type].test(trimmed)) {
    return { valid: false, error: `Invalid ${type} format` };
  }
  
  return { valid: true, sanitized: trimmed };
}

/**
 * Sanitize string for HTML output
 */
function sanitizeForHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize for email (allows some HTML)
 */
function sanitizeForEmail(str) {
  if (typeof str !== 'string') return '';
  // Allow line breaks but escape HTML
  return sanitizeForHTML(str).replace(/\n/g, '<br>');
}

/**
 * Validate request body
 */
function validateRequestBody(body, schema) {
  const errors = [];
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    const result = validateInput(value, rules.type, rules.required);
    
    if (!result.valid) {
      errors.push({ field, error: result.error });
    } else {
      sanitized[field] = result.sanitized;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

export {
  validateInput,
  sanitizeForHTML,
  sanitizeForEmail,
  validateRequestBody,
  MAX_LENGTHS,
  PATTERNS
};
