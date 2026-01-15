export default async function handler(req, res) {
  // POST only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      email,
      goal,
      body_areas,
      activity,
      priority,
      source,
      protocol_list,
      protocol_summary
    } = req.body || {};

    // Validate required fields (aligns with QUIZ_AIRTABLE_PROMPT.md)
    const requiredFields = { email, goal, body_areas, activity, priority };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const fields = {
      'Email': String(email).trim(),
      'Goal': String(goal).trim(),
      'Body Areas': String(body_areas).trim(),
      'Activity Level': String(activity).trim(),
      'Priority': String(priority).trim(),
      'Submitted At': submittedAt
    };

    // Optional tracking fields if present in Airtable
    if (source) fields['Source'] = String(source).trim();
    if (protocol_list) fields['Protocol List'] = String(protocol_list).trim();
    if (protocol_summary) fields['Protocol Summary'] = String(protocol_summary).trim();

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
      return res.status(502).json({
        error: 'Failed to save to Airtable',
        airtableStatus: airtableResponse.status,
        airtableError: errorData,
        table: tableName
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

