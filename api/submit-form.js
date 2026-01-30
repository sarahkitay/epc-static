import { validateRequestBody, sanitizeForEmail, MAX_LENGTHS } from './utils/validation.js';
import { rateLimitMiddleware } from './utils/rate-limit.js';
import { validateCSRF, sanitizeError, errorResponse, successResponse } from './utils/security.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  // Rate limiting (applies to all forms)
  if (!rateLimitMiddleware(req, res, 10, 60000)) {
    return; // Response already sent
  }

  // CSRF protection (for forms that use it)
  const formType = req.body?.formType;
  const formsWithCSRF = ['contact', 'quiz'];
  if (formsWithCSRF.includes(formType) && !validateCSRF(req)) {
    return errorResponse(res, 403, 'Invalid request origin');
  }

  try {
    // Airtable config is required. Resend is optional.
    const missingEnv = ['AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY'].filter((k) => !process.env[k]);
    if (missingEnv.length) {
      return errorResponse(res, 500, 'Server configuration error', sanitizeError({ message: 'Missing environment variables' }, true));
    }

    // Validate formType
    const validFormTypes = ['contact', 'email-signup', 'booking', 'quiz', 'fulltime-academy', 'parttime-academy', 'winter-ball'];
    if (!formType || !validFormTypes.includes(formType)) {
      return errorResponse(res, 400, 'Invalid or missing formType', { formType: formType || 'missing', validTypes: validFormTypes });
    }

    // Airtable Date fields can be strict depending on field settings; date-only is the most compatible.
    const submittedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    let fields = {};
    let tableName = '';
    let emailSubject = '';
    let emailHtml = '';
    let emailTo = [];

    // Process each form type
    switch (formType) {
      case 'contact': {
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
        fields = {
          'Name': name,
          'Email': email,
          'Subject': subject,
          'Message': message,
          'Submitted At': submittedAt,
          'Source': 'Website'  // Airtable Single Select: only "Website" accepted
        };
        if (phone) fields['Phone'] = phone;

        tableName = 'Contact Form Submissions';
        emailSubject = `📧 New Contact Form: ${subject}`;
        emailTo = ['info@epcla.com', 'sarahk@epcla.com', 'sasha@epcla.com'];
        emailHtml = `
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
                📧 New Contact Form: ${sanitizeForEmail(subject)}
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
</html>`;
        break;
      }

      case 'email-signup': {
        const { name, email, source } = req.body;
        if (!email) {
          return errorResponse(res, 400, 'Missing required field: email');
        }
        fields = {
          'Name': name || '',
          'Email': email,
          'Source': source || '',
          'Submitted At': submittedAt
        };
        tableName = 'Email List Signups';
        // No email notification for email signups
        break;
      }

      case 'booking': {
        const { name, email, phone, service, preferredDays, preferredTimes, slot1, slot2, slot3, notes, source } = req.body || {};
        const requiredFields = { name, email, phone };
        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => !value)
          .map(([key]) => key);

        if (missingFields.length > 0) {
          return errorResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        fields = {
          'Name': String(name).trim(),
          'Email': String(email).trim(),
          'Phone': String(phone).trim(),
          'Submitted At': submittedAt
        };
        if (service) fields['Service of Interest'] = String(service).trim();
        if (preferredDays) fields['Preferred Days'] = String(preferredDays).trim();
        if (preferredTimes) fields['Preferred Time Window'] = String(preferredTimes).trim();
        if (notes) fields['Notes'] = String(notes).trim();
        if (source) fields['Source'] = String(source).trim();
        if (slot1) fields['Time Option 1'] = String(slot1).trim();
        if (slot2) fields['Time Option 2'] = String(slot2).trim();
        if (slot3) fields['Time Option 3'] = String(slot3).trim();

        tableName = 'Booking Requests';
        emailSubject = service ? `📅 New Booking Request: ${service}` : '📅 New Booking Request';
        emailTo = ['info@epcla.com', 'sarahk@epcla.com', 'sasha@epcla.com'];
        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#070707;font-family:system-ui,-apple-system,sans-serif;color:#F2EDE6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#070707;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:40px;background-color:rgba(201,178,127,.08);border:1px solid rgba(201,178,127,.22);border-radius:10px;">
              <div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:rgba(201,178,127,.85);font-weight:700;margin-bottom:14px;">
                Elite Performance Clinic
              </div>
              <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:700;color:#C9B27F;">
                ${emailSubject}
              </h1>
              <div style="background-color:rgba(201,178,127,.04);border:1px solid rgba(201,178,127,.18);border-radius:8px;padding:18px;margin-bottom:18px;">
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Name:</strong> ${String(name).trim()}</p>
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Email:</strong> ${String(email).trim()}</p>
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Phone:</strong> ${String(phone).trim()}</p>
                ${service ? `<p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Service:</strong> ${String(service).trim()}</p>` : ``}
              </div>
              <div style="background-color:rgba(201,178,127,.04);border:1px solid rgba(201,178,127,.18);border-radius:8px;padding:18px;margin-bottom:18px;">
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Preferred days:</strong> ${preferredDays ? String(preferredDays).trim() : 'Not specified'}</p>
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Preferred time window:</strong> ${preferredTimes ? String(preferredTimes).trim() : 'Not specified'}</p>
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Time option 1:</strong> ${slot1 ? String(slot1).trim() : 'Not specified'}</p>
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Time option 2:</strong> ${slot2 ? String(slot2).trim() : 'Not specified'}</p>
                <p style="margin:0 0 0 0;font-size:15px;line-height:1.6;"><strong style="color:#C9B27F;">Time option 3:</strong> ${slot3 ? String(slot3).trim() : 'Not specified'}</p>
              </div>
              ${notes ? `
              <div style="background-color:rgba(201,178,127,.04);border:1px solid rgba(201,178,127,.18);border-radius:8px;padding:18px;margin-bottom:18px;">
                <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#C9B27F;font-weight:700;">Notes</p>
                <p style="margin:0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${String(notes).trim().replace(/\n/g,'<br>')}</p>
              </div>
              ` : ``}
              <p style="margin:0;font-size:12px;color:rgba(242,237,230,.6);">
                Submitted: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
        break;
      }

      case 'quiz': {
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
        fields = {
          'Email': email,
          'Goal': goal,
          'Body Areas': body_areas,
          'Activity Level': activity,
          'Priority': priority,
          'Submitted At': submittedAt
        };
        if (source) fields['Source'] = source;
        if (protocol_list) fields['Protocol List'] = protocol_list;
        if (protocol_summary) fields['Protocol Summary'] = protocol_summary;

        tableName = 'EPC Intake Quiz Submissions';
        break;
      }

      case 'fulltime-academy': {
        const { firstName, lastName, parentName, phone, email, grade, sport, dob, startTerm, homeschoolProgram, academicPriorities, highlightTapeUrl, additionalNotes } = req.body || {};
        const requiredFields = { firstName, lastName, parentName, phone, email };
        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => value === undefined || String(value).trim() === '')
          .map(([key]) => key);

        if (missingFields.length > 0) {
          return errorResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        fields = {
          'Athlete First Name': String(firstName).trim(),
          'Athlete Last Name': String(lastName).trim(),
          'Parent/Guardian Name': String(parentName).trim(),
          'Preferred Contact Phone': String(phone).trim(),
          'Email': String(email).trim(),
          'Submitted At': submittedAt
        };
        if (grade && String(grade).trim()) fields['Grade'] = String(grade).trim();
        if (sport && String(sport).trim()) fields['Sport'] = String(sport).trim();
        if (dob && String(dob).trim()) fields['Date of Birth'] = String(dob).trim();
        if (startTerm && String(startTerm).trim()) fields['Desired Start Term'] = String(startTerm).trim();
        if (homeschoolProgram && String(homeschoolProgram).trim()) fields['Current/Preferred Homeschool Program'] = String(homeschoolProgram).trim();
        if (academicPriorities && String(academicPriorities).trim()) fields['Academic Priorities'] = String(academicPriorities).trim();
        if (highlightTapeUrl && String(highlightTapeUrl).trim()) fields['Highlight Tape URL'] = String(highlightTapeUrl).trim();
        if (additionalNotes && String(additionalNotes).trim()) fields['Additional Notes'] = String(additionalNotes).trim();

        tableName = 'Full-Time Academy Applications';
        emailSubject = '🎓 New Full-Time Academy Application';
        emailTo = ['info@epcla.com', 'sarahk@epcla.com', 'sasha@epcla.com'];
        emailHtml = `
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
                🎓 New Full-Time Academy Application
              </h1>
              <div style="background-color: rgba(201,178,127,.04); border-radius: 4px; padding: 24px; margin-bottom: 20px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Student Name:</strong> ${firstName} ${lastName}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Parent/Guardian Name:</strong> ${parentName}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Phone:</strong> ${phone}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Email:</strong> ${email}</p>
                ${grade ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Grade:</strong> ${grade}</p>` : ''}
                ${sport ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Sport:</strong> ${sport}</p>` : ''}
                ${dob ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Date of Birth:</strong> ${dob}</p>` : ''}
                ${startTerm ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Desired Start Term:</strong> ${startTerm}</p>` : ''}
                ${homeschoolProgram ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Current/Preferred Homeschool Program:</strong> ${homeschoolProgram}</p>` : ''}
                ${academicPriorities ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Academic Priorities:</strong> ${academicPriorities}</p>` : ''}
                ${highlightTapeUrl ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Highlight Tape URL:</strong> <a href="${highlightTapeUrl}" style="color: #C9B27F; text-decoration: underline;">View</a></p>` : ''}
                ${additionalNotes ? `<p style="margin: 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Additional Notes:</strong><br>${String(additionalNotes).replace(/\n/g, '<br>')}</p>` : ''}
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
</html>`;
        break;
      }

      case 'parttime-academy': {
        const { firstName, lastName, parentName, phone, email, grade, sport, dob, startTerm, trainingSchedule, developmentGoals, highlightTapeUrl, additionalNotes } = req.body || {};
        const requiredFields = { firstName, lastName, parentName, phone, email };
        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => value === undefined || String(value).trim() === '')
          .map(([key]) => key);

        if (missingFields.length > 0) {
          return errorResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        fields = {
          'Athlete First Name': String(firstName).trim(),
          'Athlete Last Name': String(lastName).trim(),
          'Parent/Guardian Name': String(parentName).trim(),
          'Preferred Contact Phone': String(phone).trim(),
          'Email': String(email).trim(),
          'Submitted At': submittedAt
        };
        if (grade && String(grade).trim()) fields['Grade'] = String(grade).trim();
        if (sport && String(sport).trim()) fields['Sport'] = String(sport).trim();
        if (dob && String(dob).trim()) fields['Date of Birth'] = String(dob).trim();
        if (startTerm && String(startTerm).trim()) fields['Desired Start Term'] = String(startTerm).trim();
        if (trainingSchedule && String(trainingSchedule).trim()) fields['Training Schedule/Availability'] = String(trainingSchedule).trim();
        if (developmentGoals && String(developmentGoals).trim()) fields['Primary Development Goals'] = String(developmentGoals).trim();
        if (highlightTapeUrl && String(highlightTapeUrl).trim()) fields['Highlight Tape URL'] = String(highlightTapeUrl).trim();
        if (additionalNotes && String(additionalNotes).trim()) fields['Additional Notes'] = String(additionalNotes).trim();

        tableName = 'Part-Time Academy Applications';
        emailSubject = '⚡ New Part-Time Academy Application';
        emailTo = ['info@epcla.com', 'sarahk@epcla.com', 'sasha@epcla.com'];
        emailHtml = `
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
                ⚡ New Part-Time Academy Application
              </h1>
              <div style="background-color: rgba(201,178,127,.04); border-radius: 4px; padding: 24px; margin-bottom: 20px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Student Name:</strong> ${firstName} ${lastName}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Parent Name:</strong> ${parentName}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Phone:</strong> ${phone}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Email:</strong> ${email}</p>
                ${grade ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Grade:</strong> ${grade}</p>` : ''}
                ${sport ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Sport:</strong> ${sport}</p>` : ''}
                ${dob ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Date of Birth:</strong> ${dob}</p>` : ''}
                ${startTerm ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Start Term:</strong> ${startTerm}</p>` : ''}
                ${trainingSchedule ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Training Schedule:</strong> ${trainingSchedule}</p>` : ''}
                ${developmentGoals ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Development Goals:</strong> ${developmentGoals}</p>` : ''}
                ${highlightTapeUrl ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Highlight Tape:</strong> <a href="${highlightTapeUrl}" style="color: #C9B27F; text-decoration: underline;">View Tape</a></p>` : ''}
                ${additionalNotes ? `<p style="margin: 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Additional Notes:</strong><br>${additionalNotes.replace(/\n/g, '<br>')}</p>` : ''}
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
</html>`;
        break;
      }

      case 'winter-ball': {
        const { athleteName, age, position, clubOrSchool, parentName, phone, email, program } = req.body || {};
        const requiredFields = { athleteName, parentName, phone, email, program };
        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => value === undefined || String(value).trim() === '')
          .map(([key]) => key);

        if (missingFields.length > 0) {
          return errorResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        // Airtable Single Select accepts only: Outdoor, Indoor, Full Bundle
        const programVal = String(program || '').trim();
        const programMap = {
          'outdoor': 'Outdoor',
          'indoor': 'Indoor',
          'full bundle': 'Full Bundle',
          'outdoor ($500/month)': 'Outdoor',
          'indoor ($600/month)': 'Indoor',
          'full bundle ($1,400 for 8 weeks)': 'Full Bundle'
        };
        const programForAirtable = programMap[programVal.toLowerCase()] || (programVal.replace(/\s*\([^)]*\).*$/i, '').trim() || 'Outdoor');

        fields = {
          'Athlete Name': String(athleteName).trim(),
          'Parent/Guardian Name': String(parentName).trim(),
          'Phone Number': String(phone).trim(),
          'Email': String(email).trim(),
          'Program': programForAirtable,
          'Submitted At': submittedAt
        };
        const ageNum = age !== undefined && age !== '' && !isNaN(Number(age)) ? Number(age) : null;
        if (ageNum != null) fields['Age'] = ageNum;
        if (position && String(position).trim()) fields['Position'] = String(position).trim();
        if (clubOrSchool && String(clubOrSchool).trim()) fields['Club or School Team'] = String(clubOrSchool).trim();

        tableName = 'Winter Ball Registrations';
        emailSubject = '⚽ New Winter Ball Registration';
        emailTo = ['info@epcla.com', 'sarahk@epcla.com', 'sasha@epcla.com'];
        emailHtml = `
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
                ⚽ New Winter Ball Registration
              </h1>
              <div style="background-color: rgba(201,178,127,.04); border-radius: 4px; padding: 24px; margin-bottom: 20px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Athlete Name:</strong> ${athleteName}</p>
                ${age ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Age:</strong> ${age}</p>` : ''}
                ${position ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Position:</strong> ${position}</p>` : ''}
                ${clubOrSchool ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Club or School:</strong> ${clubOrSchool}</p>` : ''}
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Parent Name:</strong> ${parentName}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Phone:</strong> ${phone}</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Email:</strong> ${email}</p>
                <p style="margin: 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Program:</strong> ${program}</p>
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
</html>`;
        break;
      }
    }

    // Save to Airtable (typecast: true lets Single Select accept/new options and coerces types)
    const airtableBody = { fields, typecast: true };
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(airtableBody)
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { raw: errorText }; }
      console.error(`Airtable error (submit-form, ${formType}):`, airtableResponse.status, errorData);
      const airtableMsg = errorData?.error?.message || errorData?.message || (airtableResponse.status === 404 ? `Table "${tableName}" not found in Airtable base.` : 'Invalid field or table. Check Airtable table and field names.');
      // Always return Airtable message to client so user can see what failed
      return errorResponse(res, 502, airtableMsg, process.env.NODE_ENV !== 'production' ? { tableName, airtable: errorData } : null);
    }

    // Send email notification (if configured and needed)
    if (emailSubject && emailHtml && emailTo.length > 0) {
      try {
        if (!process.env.RESEND_API_KEY) {
          console.warn(`RESEND_API_KEY missing - skipping email notification (submit-form, ${formType})`);
          return successResponse(res, { emailSent: false });
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Elite Performance Clinic <noreply@epcla.com>',
            to: emailTo,
            subject: emailSubject,
            html: emailHtml
          })
        });

        if (!emailResponse.ok) {
          console.error(`Resend email error (submit-form, ${formType}):`, await emailResponse.text());
        }
      } catch (emailError) {
        console.error(`Email sending error (submit-form, ${formType}):`, emailError);
        // Continue even if email fails
      }
    }

    return successResponse(res);
  } catch (error) {
    console.error(`Handler error (submit-form, ${formType}):`, error);
    return errorResponse(res, 500, 'Internal server error', sanitizeError(error));
  }
}
