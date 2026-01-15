export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    return res.status(500).json({ 
      error: 'Missing environment variables',
      hasBaseId: !!baseId,
      hasApiKey: !!apiKey
    });
  }

  // Validate baseId format (helps catch accidental full URLs pasted into env vars)
  const baseIdLooksWrong = !String(baseId).startsWith('app') || String(baseId).includes('/') || String(baseId).includes('http');
  if (baseIdLooksWrong) {
    return res.status(500).json({
      error: 'AIRTABLE_BASE_ID looks invalid. It should look like appXXXXXXXXXXXXXX (no slashes).',
      baseIdPrefix: String(baseId).slice(0, 12) + '...'
    });
  }

  const table = String(req.query?.table || 'Email List Signups');

  // Test by reading 1 record from a real table endpoint (does not require schema/meta permissions)
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to connect to Airtable',
        status: response.status,
        details: data,
        table,
        baseId: baseId.substring(0, 10) + '...' // Show first 10 chars only
      });
    }

    return res.status(200).json({
      success: true,
      table,
      recordCount: Array.isArray(data.records) ? data.records.length : undefined,
      sampleRecord: Array.isArray(data.records) && data.records[0]
        ? { id: data.records[0].id, fields: data.records[0].fields }
        : null,
      baseId: baseId.substring(0, 10) + '...'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error connecting to Airtable',
      message: error.message
    });
  }
}
