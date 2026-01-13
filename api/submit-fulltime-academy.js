export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      firstName,
      lastName,
      parentName,
      phone,
      email,
      grade,
      sport,
      dob,
      startTerm,
      homeschoolProgram,
      academicPriorities,
      highlightTapeUrl,
      additionalNotes
    } = req.body;

    // Validate required fields
    const requiredFields = { firstName, lastName, parentName, phone, email };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Save to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent('Full-Time Academy Applications')}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'First Name': firstName,
            'Last Name': lastName,
            'Parent Name': parentName,
            'Phone': phone,
            'Email': email,
            'Grade': grade || '',
            'Sport': sport || '',
            'Date of Birth': dob || '',
            'Start Term': startTerm || '',
            'Homeschool Program': homeschoolProgram || '',
            'Academic Priorities': academicPriorities || '',
            'Highlight Tape URL': highlightTapeUrl || '',
            'Additional Notes': additionalNotes || '',
            'Submitted At': new Date().toISOString()
          }
        })
      }
    );

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.json().catch(() => ({}));
      console.error('Airtable error:', errorData);
      return res.status(500).json({ error: 'Failed to save to Airtable' });
    }

    // Send email notification (don't fail if email fails)
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Elite Performance Clinic <noreply@epcla.com>',
          to: ['sarahk@epcla.com', 'sasha@epcla.com', 'info@epcla.com', 'aguadoc7@yahoo.com'],
          subject: '🎓 New Full-Time Academy Application',
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
                🎓 New Full-Time Academy Application
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
                ${homeschoolProgram ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Homeschool Program:</strong> ${homeschoolProgram}</p>` : ''}
                ${academicPriorities ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;"><strong style="color: #C9B27F;">Academic Priorities:</strong> ${academicPriorities}</p>` : ''}
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
