export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Airtable config is required. Resend is optional (we'll still save even if email is disabled).
    const missingEnv = ['AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY'].filter((k) => !process.env[k]);
    if (missingEnv.length) {
      return res.status(500).json({
        error: `Server configuration missing environment variables: ${missingEnv.join(', ')}`,
        missingEnv
      });
    }

    // Airtable Date fields can be strict depending on field settings; date-only is the most compatible.
    const submittedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const {
      name,
      email,
      phone,
      service,
      preferredDays,
      preferredTimes,
      slot1,
      slot2,
      slot3,
      notes,
      source
    } = req.body || {};

    const requiredFields = { name, email, phone };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const fields = {
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

    // Date/time options - only include if present (Airtable date fields cannot accept empty strings)
    if (slot1) fields['Time Option 1'] = String(slot1).trim();
    if (slot2) fields['Time Option 2'] = String(slot2).trim();
    if (slot3) fields['Time Option 3'] = String(slot3).trim();

    // Save to Airtable
    const tableName = 'Booking Requests';
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
      console.error('Airtable error (submit-booking-request):', airtableResponse.status, errorData);
      return res.status(502).json({
        error: 'Failed to save to Airtable',
        airtableStatus: airtableResponse.status,
        airtableError: errorData,
        table: tableName
      });
    }

    // Send email notification (optional - do not fail the request if email fails)
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY missing - skipping email notification (submit-booking-request)');
        return res.status(200).json({ success: true, emailSent: false });
      }

      const subj = service ? `📅 New Booking Request: ${service}` : '📅 New Booking Request';

      const html = `
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
                ${subj}
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

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Elite Performance Clinic <noreply@epcla.com>',
          to: ['info@epcla.com', 'sarahk@epcla.com'],
          subject: subj,
          html
        })
      });

      if (!emailResponse.ok) {
        console.error('Resend email error:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

