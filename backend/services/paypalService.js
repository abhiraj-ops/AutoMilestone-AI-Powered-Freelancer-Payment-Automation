let tokenCache = { token: null, expiresAt: 0 };

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing PayPal credentials');

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetchWithTimeout('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('[PayPal] getAccessToken failed status=', res.status);
    throw new Error('Failed to get PayPal access token');
  }

  const expiresIn = Number(data.expires_in || 3600) * 1000;
  tokenCache = { token: data.access_token, expiresAt: now + expiresIn };
  return data.access_token;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYOUT = 100000;

async function sendPayout(freelancerEmail, amount, milestoneTitle) {
  const email = String(freelancerEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Invalid freelancer email');
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_PAYOUT) throw new Error('Invalid payout amount');

  const accessToken = await getAccessToken();
  const safeTitle = String(milestoneTitle || 'Milestone').slice(0, 200);
  const batchId = `ms-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const payload = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: `Payment received: ${safeTitle}`.slice(0, 127),
      email_message: 'Your milestone was verified and approved. Payment sent via AutoMilestone.',
    },
    email_message: 'Your milestone was verified and approved. Payment sent via AutoMilestone.',
    items: [{
      recipient_type: 'EMAIL',
      amount: { value: amt.toFixed(2), currency: 'USD' },
      receiver: email,
      note: `AutoMilestone — ${safeTitle}`.slice(0, 200),
      sender_item_id: itemId,
    }],
  };

  const res = await fetchWithTimeout('https://api-m.sandbox.paypal.com/v1/payments/payouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[PayPal] sendPayout failed status=', res.status, 'code=', data && data.name ? data.name : 'unknown');
    throw new Error('PayPal payout failed');
  }
  return data;
}

module.exports = { getAccessToken, sendPayout };
