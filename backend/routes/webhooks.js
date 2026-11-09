const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/webhooks/paypal', (req, res) => {
  try {
    const event = req.body || {};
    const eventType = event.event_type || event.type || '';

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
    console.error('[POST /api/webhooks/paypal]', err);
    return res.status(200).json({ ok: true });
  }
});

module.exports = router;
