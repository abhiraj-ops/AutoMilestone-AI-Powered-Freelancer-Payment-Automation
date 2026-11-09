const express = require('express');
const db = require('../db');
const { getAccessToken } = require('../services/paypalService');
const { handleValidation, uuidParam, body } = require('../middleware/validate');
const { errorMessage } = require('../middleware/logger');

const router = express.Router();

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

router.post(
  '/paypal/create-order',
  body('amount').custom((v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error('amount must be 0-100000');
    return true;
  }),
  body('projectId').isUUID().withMessage('projectId must be uuid'),
  handleValidation,
  async (req, res) => {
    try {
      const amt = Number(req.body.amount);
      const projectId = req.body.projectId;
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found.' });

      const accessToken = await getAccessToken();
      const payload = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amt.toFixed(2) },
          description: `AutoMilestone project ${projectId}`,
        }],
      };

      const payRes = await fetchWithTimeout('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      const data = await payRes.json().catch(() => ({}));
      if (!payRes.ok || !data.id) {
        console.error('[PayPal create-order]', payRes.status, data && data.error ? data.error : '');
        return res.status(502).json({ error: 'Failed to create PayPal order.' });
      }
      res.json({ id: data.id });
    } catch (err) {
      console.error('[POST /api/paypal/create-order]', errorMessage(err));
      res.status(500).json({ error: 'Failed to create order.' });
    }
  }
);

router.post(
  '/paypal/capture-order',
  body('orderID').trim().isLength({ min: 10, max: 64 }).withMessage('orderID invalid').matches(/^[A-Za-z0-9_-]+$/).withMessage('orderID invalid'),
  body('projectId').isUUID().withMessage('projectId must be uuid'),
  handleValidation,
  async (req, res) => {
    try {
      const { orderID, projectId } = req.body;
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found.' });

      const accessToken = await getAccessToken();
      const capRes = await fetchWithTimeout(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      });

      const data = await capRes.json().catch(() => ({}));
      if (!capRes.ok) {
        console.error('[PayPal capture-order]', capRes.status, data && data.error ? data.error : '');
        return res.status(502).json({ error: 'Failed to capture PayPal order.' });
      }

      db.prepare(`UPDATE projects SET paypal_order_id = ?, status = 'active' WHERE id = ?`).run(orderID, projectId);
      res.json(data);
    } catch (err) {
      console.error('[POST /api/paypal/capture-order]', errorMessage(err));
      res.status(500).json({ error: 'Failed to capture order.' });
    }
  }
);

module.exports = router;
