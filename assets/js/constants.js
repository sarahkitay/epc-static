/**
 * Application Constants
 * Centralized configuration values
 */

const APP_CONSTANTS = {
  // Authentication
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  PARENT_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Input Limits
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,
  MAX_NAME_LENGTH: 100,
  MAX_TEXT_LENGTH: 10000,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_NOTES_LENGTH: 2000,
  
  // Firebase
  FIREBASE_INIT_MAX_ATTEMPTS: 10,
  FIREBASE_INIT_RETRY_DELAY: 500, // milliseconds
  FIREBASE_CHECK_MAX_ATTEMPTS: 20,
  FIREBASE_CHECK_RETRY_DELAY: 500,
  
  // Rate Limiting (client-side hints)
  MIN_REQUEST_INTERVAL: 1000, // 1 second between requests
  
  // Pagination
  CLIENTS_PER_PAGE: 50,
  ASSESSMENTS_PER_PAGE: 20,
  
  // Validation Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\d\s\-\+\(\)]+$/,
    NAME: /^[a-zA-Z\s\-'\.]+$/,
    URL: /^https?:\/\/.+/
  },
  
  // Error Messages
  ERRORS: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_NAME: 'Please enter a valid name',
    TOO_LONG: 'Input is too long',
    NETWORK_ERROR: 'Network error. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    NOT_FOUND: 'Resource not found.',
    RATE_LIMIT: 'Too many requests. Please wait a moment.'
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.APP_CONSTANTS = APP_CONSTANTS;
}
