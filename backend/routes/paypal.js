const express = require('express');
const db = require('../db');
const { getAccessToken } = require('../services/paypalService');

const router = express.Router();

router.post('/paypal/create-order', async (req, res) => {
  try {
    const { amount, projectId } = req.body;
    const amt = Number(amount);

    if (amount == null || Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required.' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const accessToken = await getAccessToken();

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: amt.toFixed(2) },
          description: `AutoMilestone project ${projectId}`,
        },
      ],
    };

    const payRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await payRes.json().catch(() => ({}));
    if (!payRes.ok || !data.id) {
      console.error('[PayPal create-order]', payRes.status, JSON.stringify(data));
      return res.status(payRes.status || 502).json({ error: data.message || data.error || 'Failed to create PayPal order.' });
    }

    res.json({ id: data.id });
  } catch (err) {
    console.error('[POST /api/paypal/create-order]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/paypal/capture-order', async (req, res) => {
  try {
    const { orderID, projectId } = req.body;
    if (!orderID || !projectId) {
      return res.status(400).json({ error: 'orderID and projectId are required.' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const accessToken = await getAccessToken();

    const capRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    const data = await capRes.json().catch(() => ({}));
    if (!capRes.ok) {
      console.error('[PayPal capture-order]', capRes.status, JSON.stringify(data));
      return res.status(capRes.status || 502).json({ error: data.message || data.error || 'Failed to capture PayPal order.' });
    }

    db.prepare(`UPDATE projects SET paypal_order_id = ?, status = 'active' WHERE id = ?`).run(orderID, projectId);

    res.json(data);
  } catch (err) {
    console.error('[POST /api/paypal/capture-order]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
