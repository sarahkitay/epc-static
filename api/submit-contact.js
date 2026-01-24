const { validateRequestBody, sanitizeForEmail, MAX_LENGTHS } = require('./utils/validation');
const { rateLimitMiddleware } = require('./utils/rate-limit');
const { validateCSRF, sanitizeError, errorResponse, successResponse } = require('./utils/security');

export default async function handler(req, res) {
  // Only allow POST requests
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
    // Airtable config is required. Resend is optional (we'll still save even if email is disabled).
    const missingEnv = ['AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY'].filter((k) => !process.env[k]);
    if (missingEnv.length) {
      return errorResponse(res, 500, 'Server configuration error', sanitizeError({ message: 'Missing environment variables' }, true));
    }

    // Airtable Date fields can be strict depending on field settings; date-only is the most compatible.
    const submittedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Validate and sanitize input
    const validation = validateRequestBody(req.body, {
      name: { type: 'name', required: true },
      email: { type: 'email', required: true },
      phone: { type: 'phone', required: false },
      subject: { type: 'text', required: true },
      message: { type: 'message', required: true }
    });

    if (!validation.valid) {
      return errorResponse(res, 400, 'Validation failed', validation.errors);
    }

    const { name, email, phone, subject, message } = validation.sanitized;

    // Build fields object, only including optional fields if they have values
    const fields = {
      'Name': name,
      'Email': email,
      'Subject': subject,
      'Message': message,
      'Submitted At': submittedAt
    };

    // Add optional fields only if they have values
    if (phone) fields['Phone'] = phone;

    // Save to Airtable
    const tableName = 'Contact Form Submissions';
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
      console.error('Airtable error (submit-contact):', airtableResponse.status, errorData);
      return res.status(502).json({
        error: 'Failed to save to Airtable',
        airtableStatus: airtableResponse.status,
        airtableError: errorData,
        table: tableName
      });
    }

    // Send email notification (optional - don't fail if email fails)
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY missing - skipping email notification (submit-contact)');
        return res.status(200).json({ success: true, emailSent: false });
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Elite Performance Clinic <noreply@epcla.com>',
          to: ['info@epcla.com', 'sarahk@epcla.com'],
          subject: `📧 New Contact Form: ${subject}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #070707; font-family: system-ui, -apple-system, sans-serif; color: #F2EDE6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #070707; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 40px; background-color: rgba(201,178,127,.08); border: 1px solid rgba(201,178,127,.22); border-radius: 8px;">
              <h1 style="margin: 0 0 30px 0; font-size: 24px; font-weight: 600; color: #C9B27F; letter-spacing: 0.5px;">
                📧 New Contact Form: ${subject}
              </h1>
              <div style="background-color: rgba(201,178,127,.04); border-radius: 4px; padding: 24px; margin-bottom: 20px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Name:</strong> ${sanitizeForEmail(name)}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Email:</strong> ${sanitizeForEmail(email)}</p>
                ${phone ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Phone:</strong> ${sanitizeForEmail(phone)}</p>` : ''}
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Subject:</strong> ${sanitizeForEmail(subject)}</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(201,178,127,.2);">
                  <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #C9B27F; font-weight: 600;">Message:</p>
                  <p style="margin: 0; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${sanitizeForEmail(message)}</p>
                </div>
              </div>
              <p style="margin: 20px 0 0 0; font-size: 14px; color: rgba(242,237,230,.6);">
                Submitted: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `
        })
      });

      if (!emailResponse.ok) {
        console.error('Resend email error:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue even if email fails
    }

    return successResponse(res);
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse(res, 500, 'Internal server error', sanitizeError(error));
  }
}
