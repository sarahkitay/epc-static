# Security Fixes Implementation Guide

This guide outlines all the security fixes that have been implemented and what you need to do to complete the setup.

## ✅ What Has Been Implemented

### 1. Security Utilities Created
- ✅ `assets/js/security-utils.js` - Client-side sanitization and validation
- ✅ `assets/js/constants.js` - Centralized constants
- ✅ `api/utils/validation.js` - Server-side input validation
- ✅ `api/utils/rate-limit.js` - Rate limiting middleware
- ✅ `api/utils/security.js` - Security helpers (CSRF, error handling)

### 2. Security Headers Added
- ✅ Content Security Policy (CSP) headers
- ✅ HTTPS redirect
- ✅ HSTS headers
- ✅ Referrer Policy
- ✅ Permissions Policy

### 3. API Endpoint Updates
- ✅ `api/submit-contact.js` - Updated with validation, rate limiting, CSRF protection, and sanitization

### 4. Client-Side Updates
- ✅ DOMPurify library added to client pages
- ✅ Security utilities loaded in dashboard.html and client.html

## 🔧 What You Need to Do

### Step 1: Update Remaining API Endpoints

You need to update all other API endpoints with the same security measures. Here's the pattern:

**For each API file in `/api/` directory:**

1. Add imports at the top:
```javascript
const { validateRequestBody, sanitizeForEmail, MAX_LENGTHS } = require('./utils/validation');
const { rateLimitMiddleware } = require('./utils/rate-limit');
const { validateCSRF, sanitizeError, errorResponse, successResponse } = require('./utils/security');
```

2. Add rate limiting and CSRF check after method check:
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  // Rate limiting
  if (!rateLimitMiddleware(req, res, 10, 60000)) {
    return;
  }

  // CSRF protection
  if (!validateCSRF(req)) {
    return errorResponse(res, 403, 'Invalid request origin');
  }
  // ... rest of code
}
```

3. Replace input validation with `validateRequestBody()`:
```javascript
// OLD:
const { name, email } = req.body;
if (!name || !email) {
  return res.status(400).json({ error: 'Missing fields' });
}

// NEW:
const validation = validateRequestBody(req.body, {
  name: { type: 'name', required: true },
  email: { type: 'email', required: true }
});

if (!validation.valid) {
  return errorResponse(res, 400, 'Validation failed', validation.errors);
}

const { name, email } = validation.sanitized;
```

4. Sanitize all email template inputs:
```javascript
// OLD:
html: `<p>${name}</p>`

// NEW:
html: `<p>${sanitizeForEmail(name)}</p>`
```

5. Replace error responses:
```javascript
// OLD:
return res.status(500).json({ error: 'Internal server error' });

// NEW:
return errorResponse(res, 500, 'Internal server error', sanitizeError(error));
```

**Files to update:**
- `api/submit-quiz.js`
- `api/submit-booking-request.js`
- `api/submit-email-signup.js`
- `api/submit-fulltime-academy.js`
- `api/submit-parttime-academy.js`
- `api/submit-winter-ball.js`

### Step 2: Update Client-Side innerHTML Usage

Replace all `innerHTML` assignments with safe alternatives:

**Pattern 1: Use `setSafeHTML()` for HTML content:**
```javascript
// OLD:
element.innerHTML = `<div>${userInput}</div>`;

// NEW:
if (typeof setSafeHTML !== 'undefined') {
  setSafeHTML(element, `<div>${escapeHtml(userInput)}</div>`);
} else {
  element.textContent = userInput; // Fallback
}
```

**Pattern 2: Use `textContent` for plain text:**
```javascript
// OLD:
element.innerHTML = userInput;

// NEW:
element.textContent = userInput;
```

**Files to update:**
- `clients/client.js` - ~20 instances
- `clients/app.js` - ~3 instances
- `index.html` - ~5 instances
- `clients/parent-view.html` - ~7 instances

### Step 3: Move Password Authentication to Server-Side

**CRITICAL:** The password is currently hardcoded in client-side code. You need to:

1. Create a new API endpoint: `api/auth-login.js`
```javascript
const { validateRequestBody, errorResponse, successResponse } = require('./utils/validation');
const { rateLimitMiddleware } = require('./utils/rate-limit');
const crypto = require('crypto');

// Store this in environment variable
const CORRECT_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Use bcrypt hash

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  if (!rateLimitMiddleware(req, res, 5, 60000)) { // Stricter for login
    return;
  }

  const validation = validateRequestBody(req.body, {
    password: { type: 'text', required: true }
  });

  if (!validation.valid) {
    return errorResponse(res, 400, 'Validation failed');
  }

  // Verify password (use bcrypt.compare in production)
  const isValid = await verifyPassword(validation.sanitized.password);
  
  if (isValid) {
    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    // Store in secure httpOnly cookie or return to client
    return successResponse(res, { token: sessionToken });
  } else {
    return errorResponse(res, 401, 'Invalid password');
  }
}
```

2. Update `clients/app.js` to call this API instead of checking password locally.

3. Set environment variable in Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `ADMIN_PASSWORD_HASH` = (bcrypt hash of your password)

### Step 4: Update Firestore Security Rules

**CRITICAL:** Update your Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow authenticated requests
    match /clients/{clientId} {
      allow read, write: if request.auth != null || 
        request.headers.get('x-api-key') == 'your-secret-key';
    }
    
    // Or if using password-based auth, restrict by IP or add API key
    match /{document=**} {
      allow read, write: if request.headers.get('x-api-key') == 'your-secret-key';
    }
  }
}
```

### Step 5: Environment Variables Setup

Add these to Vercel Environment Variables:

1. **Required:**
   - `AIRTABLE_BASE_ID` - Already set
   - `AIRTABLE_API_KEY` - Already set
   - `RESEND_API_KEY` - Already set

2. **New (for password auth):**
   - `ADMIN_PASSWORD_HASH` - bcrypt hash of password (generate with: `bcrypt.hash('15125', 10)`)

3. **Optional (for enhanced security):**
   - `CSRF_SECRET` - Random string for CSRF token signing
   - `API_SECRET_KEY` - Secret key for API authentication

### Step 6: Remove/Sanitize Console Logs

1. Search for all `console.log` statements
2. Remove or wrap in development check:
```javascript
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info');
}
```

For client-side:
```javascript
if (window.location.hostname === 'localhost') {
  console.log('Debug info');
}
```

### Step 7: Test All Changes

1. **Test API endpoints:**
   - Submit forms with malicious input (XSS attempts)
   - Test rate limiting (submit 15 requests quickly)
   - Test CSRF (try from different origin)

2. **Test client-side:**
   - Try injecting scripts via form inputs
   - Verify all innerHTML is sanitized
   - Test password authentication

3. **Test security headers:**
   - Use https://securityheaders.com to check headers
   - Verify CSP is working
   - Check HTTPS redirect

## 📋 Checklist

- [ ] Update all API endpoints with security utilities
- [ ] Replace all innerHTML with safe alternatives
- [ ] Move password auth to server-side
- [ ] Update Firestore security rules
- [ ] Set environment variables in Vercel
- [ ] Remove/sanitize console.logs
- [ ] Test all security fixes
- [ ] Deploy and verify

## 🚨 Critical Reminders

1. **Never commit passwords or API keys** to git
2. **Always validate on server-side** - client-side validation is for UX only
3. **Use environment variables** for all secrets
4. **Test in production** after deployment
5. **Monitor error logs** for security issues

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Next Steps:** Start with Step 1 (updating API endpoints) as it's the most critical for security.
