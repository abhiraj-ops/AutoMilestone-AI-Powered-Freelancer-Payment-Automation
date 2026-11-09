// Optional API-key gate. Disabled when API_KEY is not set (local demo mode).
// In production set API_KEY and have the frontend send `X-API-Key: <key>`.
function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  const provided = req.get('X-API-Key') || req.get('x-api-key');
  if (provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Same, but for webhook/webhook-like public ingress we skip (they use PayPal signature instead).
module.exports = { requireApiKey };
