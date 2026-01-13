export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      athleteName,
      age,
      position,
      clubOrSchool,
      parentName,
      phone,
      email,
      program
    } = req.body;

    // Validate required fields
    const requiredFields = { athleteName, parentName, phone, email, program };
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
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Winter Ball Registrations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Athlete Name': athleteName,
            'Age': age || '',
            'Position': position || '',
            'Club or School': clubOrSchool || '',
            'Parent Name': parentName,
            'Phone': phone,
            'Email': email,
            'Program': program,
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
          subject: '⚽ New Winter Ball Registration',
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
