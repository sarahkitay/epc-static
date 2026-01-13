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

  // Test by listing tables in the base
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to connect to Airtable',
        status: response.status,
        details: data,
        baseId: baseId.substring(0, 10) + '...' // Show first 10 chars only
      });
    }

    // Get field names for each table
    const tablesWithFields = data.tables?.map(table => ({
      name: table.name,
      fields: table.fields?.map(f => ({
        name: f.name,
        type: f.type
      })) || []
    })) || [];

    return res.status(200).json({
      success: true,
      tables: tablesWithFields,
      baseId: baseId.substring(0, 10) + '...'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error connecting to Airtable',
      message: error.message
    });
  }
}
