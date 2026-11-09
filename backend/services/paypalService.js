async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('[PayPal] getAccessToken failed:', res.status, JSON.stringify(data));
    throw new Error(data.error_description || data.error || 'Failed to get PayPal access token');
  }

  return data.access_token;
}

async function sendPayout(freelancerEmail, amount, milestoneTitle) {
  const accessToken = await getAccessToken();

  const payload = {
    sender_batch_header: {
      sender_batch_id: `ms-${Date.now()}`,
      email_subject: `Payment received: ${milestoneTitle}`,
      email_message: 'Your milestone was verified and approved. Payment sent via AutoMilestone.',
    },
    email_message: 'Your milestone was verified and approved. Payment sent via AutoMilestone.',
    items: [
      {
        recipient_type: 'EMAIL',
        amount: { value: Number(amount).toFixed(2), currency: 'USD' },
        receiver: freelancerEmail,
        note: `AutoMilestone — ${milestoneTitle}`,
        sender_item_id: `item-${Date.now()}`,
      },
    ],
  };

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/payments/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[PayPal] sendPayout failed:', res.status, JSON.stringify(data));
    throw new Error(data.message || data.error || 'PayPal payout failed');
  }

  return data;
}

module.exports = { getAccessToken, sendPayout };
