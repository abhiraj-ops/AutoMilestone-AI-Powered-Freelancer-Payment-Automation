const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyMilestone } = require('../services/geminiService');
const { sendPayout } = require('../services/paypalService');

const router = express.Router();

router.post('/verify-milestone/:id', async (req, res) => {
  try {
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(milestone.project_id);
    if (!project) return res.status(404).json({ error: 'Parent project not found.' });

    if (!milestone.deliverable_text) {
      return res.status(400).json({ error: 'No deliverable submitted for this milestone. Submit deliverable first.' });
    }

    const result = await verifyMilestone(milestone, project.description);

    db.prepare(`UPDATE milestones SET ai_score = ?, ai_feedback = ?, status = ? WHERE id = ?`).run(
      result.score,
      result.feedback || '',
      result.approved ? 'approved' : 'needs-revision',
      milestone.id
    );

    let payoutTriggered = false;
    let payout = null;
    let payoutError = null;

    if (result.approved) {
      try {
        payout = await sendPayout(project.freelancer_email, milestone.amount, milestone.title);
        const batchId = payout?.sender_batch_header?.sender_batch_id || payout?.batch_id || null;
        const payoutItemId =
          payout?.items?.[0]?.payout_item_id || payout?.sender_batch_header?.sender_batch_id || batchId || null;

        const paymentId = uuidv4();
        db.prepare(`INSERT INTO payments (id, milestone_id, amount, paypal_payout_id, status, paid_at)
                    VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`).run(
          paymentId,
          milestone.id,
          Number(milestone.amount),
          payoutItemId
        );

        db.prepare(`UPDATE milestones SET payout_batch_id = ?, status = 'paid' WHERE id = ?`).run(batchId, milestone.id);
        payoutTriggered = true;
      } catch (payoutErr) {
        console.error('[POST /api/verify-milestone] payout failed:', payoutErr.message);
        payoutError = payoutErr.message || 'Payout failed';
      }
    }

    const updatedMilestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestone.id);

    res.json({
      approved: result.approved,
      score: result.score,
      feedback: result.feedback,
      missing: result.missing,
      milestone: updatedMilestone,
      payout_triggered: payoutTriggered,
      payout: payout || null,
      payout_error: payoutError,
    });
  } catch (err) {
    console.error('[POST /api/verify-milestone/:id]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
