/**
 * Square API - handles both config (GET) and payment creation (POST)
 * Env vars (Vercel → Project → Settings → Environment Variables):
 *   SQUARE_APPLICATION_ID   (Square Developer Console – app id)
 *   SQUARE_LOCATION_ID      (Square Developer Console – Locations → Location ID)
 *   SQUARE_ACCESS_TOKEN     (Square Developer Console – Access Token)
 *   SQUARE_USE_SANDBOX      (optional) set to "true" when using sandbox credentials
 */
export default async function handler(req, res) {
  // GET: Return Square configuration for frontend SDK
  if (req.method === 'GET') {
    const applicationId = process.env.SQUARE_APPLICATION_ID || '';
    const locationId = process.env.SQUARE_LOCATION_ID || '';
    const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
    const useSandbox = (process.env.SQUARE_USE_SANDBOX || '').toLowerCase() === 'true';

    // Check if all required vars are present
    const hasAppId = !!applicationId;
    const hasLocationId = !!locationId;
    const hasAccessToken = !!accessToken;
    const configured = hasAppId && hasLocationId && hasAccessToken;

    // Debug logging (remove in production if needed)
    console.log('Square config check:', {
      hasAppId,
      hasLocationId,
      hasAccessToken,
      configured,
      appIdLength: applicationId.length,
      locationIdLength: locationId.length,
      accessTokenLength: accessToken.length
    });

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({
      configured,
      useSandbox,
      ...(configured ? { applicationId, locationId } : {}),
      // Include debug info in development
      ...(process.env.NODE_ENV !== 'production' ? {
        debug: {
          hasAppId,
          hasLocationId,
          hasAccessToken
        }
      } : {})
    });
  }

  // POST: Create a Square payment
  if (req.method === 'POST') {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
    const locationId = process.env.SQUARE_LOCATION_ID || '';

    if (!accessToken || !locationId) {
      return res.status(503).json({
        error: 'Square not configured. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in Vercel environment variables.',
      });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { sourceId, amount, idempotencyKey, clientId, clientName, packageName, sessionCount } = body;

      if (!sourceId || amount == null || !idempotencyKey) {
        return res.status(400).json({ error: 'Missing sourceId, amount, or idempotencyKey' });
      }

      const squarePaymentsUrl = 'https://connect.squareup.com/v2/payments';
      const squareRes = await fetch(squarePaymentsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: sourceId,
          amount_money: { amount: Number(amount), currency: 'USD' },
          idempotency_key: idempotencyKey,
          location_id: locationId,
          note: clientName ? `Package: ${packageName || 'Session package'}, Client: ${clientName} (ID ${clientId})` : undefined,
        }),
      });

      const data = await squareRes.json();
      if (!squareRes.ok) {
        return res.status(squareRes.status >= 500 ? 502 : 400).json({
          error: data.errors?.[0]?.detail || data.message || 'Square payment failed',
        });
      }

      return res.status(200).json({ success: true, payment: data.payment });
    } catch (e) {
      console.error('create-square-payment error:', e);
      return res.status(500).json({ error: e.message || 'Payment request failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
