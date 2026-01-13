export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, source } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        error: 'Missing required field: email'
      });
    }

    // Save to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent('Email List Signups')}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Email': email,
            'Source': source || '',
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

    // No email notification for email signups
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
