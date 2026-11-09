const express = require('express');
const db = require('../db');
const { getAccessToken } = require('../services/paypalService');

const router = express.Router();

async function verifyWebhookSignature(event, headers) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // In dev, allow unverified but warn loudly. In production, reject.
    if (process.env.NODE_ENV === 'production') throw new Error('PAYPAL_WEBHOOK_ID not configured');
    console.warn('[webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification (dev only)');
    return true;
  }

  const accessToken = await getAccessToken();
  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: webhookId,
    webhook_event: event,
  };

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.verification_status !== 'SUCCESS') throw new Error('Webhook signature invalid');
  return true;
}

router.post('/webhooks/paypal', async (req, res) => {
  // Always return 200 on success path; invalid sig returns 400 (so PayPal retries appropriately)
  try {
    const event = req.body || {};
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    try {
      await verifyWebhookSignature(event, headers);
    } catch (sigErr) {
      console.error('[webhook] signature verification failed');
      if (process.env.NODE_ENV === 'production') return res.status(400).json({ ok: false });
      // dev: continue but log
    }

    const eventType = event.event_type || '';

    if (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
      const payoutItemId = event?.resource?.payout_item_id || event?.resource?.payout_item?.payout_item_id || null;
      if (payoutItemId) {
        db.prepare(`UPDATE payments SET status = 'completed' WHERE paypal_payout_id = ?`).run(payoutItemId);
      }
    }

    if (eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED') {
      const payoutItemId = event?.resource?.payout_item_id || null;
      if (payoutItemId) {
        db.prepare(`UPDATE payments SET status = 'failed' WHERE paypal_payout_id = ?`).run(payoutItemId);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[POST /api/webhooks/paypal]', err && err.message ? err.message : 'error');
    return res.status(200).json({ ok: true });
  }
});

module.exports = router;
