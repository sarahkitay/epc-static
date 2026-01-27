import { validateRequestBody, sanitizeForEmail, MAX_LENGTHS } from './utils/validation.js';
import { rateLimitMiddleware } from './utils/rate-limit.js';
import { validateCSRF, sanitizeError, errorResponse, successResponse } from './utils/security.js';

export default async function handler(req, res) {
  // POST only
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  // Rate limiting
  if (!rateLimitMiddleware(req, res, 10, 60000)) {
    return; // Response already sent
  }

  // CSRF protection
  if (!validateCSRF(req)) {
    return errorResponse(res, 403, 'Invalid request origin');
  }

  try {
    const missingEnv = ['AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY'].filter((k) => !process.env[k]);
    if (missingEnv.length) {
      return errorResponse(res, 500, 'Server configuration error', sanitizeError({ message: 'Missing environment variables' }, true));
    }

    // Validate that request body exists and is not empty
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return errorResponse(res, 400, 'Request payload is empty or invalid');
    }

    // Airtable Date fields can be strict depending on field settings; date-only is the most compatible.
    const submittedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Validate and sanitize input
    const validation = validateRequestBody(req.body, {
      email: { type: 'email', required: true },
      goal: { type: 'text', required: true },
      body_areas: { type: 'text', required: true },
      activity: { type: 'text', required: true },
      priority: { type: 'text', required: true },
      source: { type: 'text', required: false },
      protocol_list: { type: 'text', required: false },
      protocol_summary: { type: 'text', required: false }
    });

    if (!validation.valid) {
      return errorResponse(res, 400, 'Validation failed', validation.errors);
    }

    const { email, goal, body_areas, activity, priority, source, protocol_list, protocol_summary } = validation.sanitized;

    // Ensure fields object is not empty before sending to Airtable
    const fields = {
      'Email': email,
      'Goal': goal,
      'Body Areas': body_areas,
      'Activity Level': activity,
      'Priority': priority,
      'Submitted At': submittedAt
    };

    // Optional tracking fields if present in Airtable
    if (source) fields['Source'] = source;
    if (protocol_list) fields['Protocol List'] = protocol_list;
    if (protocol_summary) fields['Protocol Summary'] = protocol_summary;

    // Final validation: ensure fields object is not empty
    if (!fields || Object.keys(fields).length === 0) {
      return errorResponse(res, 400, 'No valid data to save');
    }

    const tableName = 'EPC Intake Quiz Submissions';
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { raw: errorText }; }
      console.error('Airtable error (submit-quiz):', airtableResponse.status, errorData);
      return errorResponse(res, 502, 'Failed to save to Airtable', sanitizeError({ message: 'Airtable error' }, true));
    }

    return successResponse(res);
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse(res, 500, 'Internal server error', sanitizeError(error));
  }
}

