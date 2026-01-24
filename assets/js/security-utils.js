/**
 * Security Utilities for EPC
 * Provides sanitization, validation, and security helpers
 */

// HTML Sanitization using DOMPurify (loaded via CDN)
function sanitizeHTML(dirty) {
  if (typeof DOMPurify === 'undefined') {
    // Fallback: basic escaping if DOMPurify not loaded
    const div = document.createElement('div');
    div.textContent = dirty;
    return div.innerHTML;
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['strong', 'em', 'u', 'br', 'p', 'a', 'ul', 'ol', 'li', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'class', 'style', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Safe innerHTML setter
function setSafeHTML(element, html) {
  if (!element) return;
  if (typeof html !== 'string') html = String(html);
  element.innerHTML = sanitizeHTML(html);
}

// Input validation
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    message: 'Please enter a valid email address'
  },
  phone: {
    pattern: /^[\d\s\-\+\(\)]+$/,
    maxLength: 20,
    message: 'Please enter a valid phone number'
  },
  name: {
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    maxLength: 100,
    message: 'Please enter a valid name'
  },
  text: {
    maxLength: 10000,
    message: 'Text is too long'
  },
  url: {
    pattern: /^https?:\/\/.+/,
    maxLength: 2048,
    message: 'Please enter a valid URL'
  }
};

function validateInput(value, type = 'text', required = false) {
  if (required && (!value || value.trim().length === 0)) {
    return { valid: false, error: 'This field is required' };
  }
  
  if (!value || value.trim().length === 0) {
    return { valid: true }; // Optional fields can be empty
  }
  
  const rule = VALIDATION_RULES[type];
  if (!rule) {
    return { valid: true }; // Unknown type, just check length
  }
  
  if (value.length > rule.maxLength) {
    return { valid: false, error: rule.message || 'Input is too long' };
  }
  
  if (rule.pattern && !rule.pattern.test(value)) {
    return { valid: false, error: rule.message };
  }
  
  return { valid: true };
}

// Sanitize text for email templates
function sanitizeForEmail(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 10000); // Max length
}

// Truncate string safely
function truncate(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// Generate CSRF token (simple implementation)
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Store CSRF token in session storage
function getOrCreateCSRFToken() {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.sanitizeHTML = sanitizeHTML;
  window.escapeHtml = escapeHtml;
  window.setSafeHTML = setSafeHTML;
  window.validateInput = validateInput;
  window.sanitizeForEmail = sanitizeForEmail;
  window.truncate = truncate;
  window.getOrCreateCSRFToken = getOrCreateCSRFToken;
}
