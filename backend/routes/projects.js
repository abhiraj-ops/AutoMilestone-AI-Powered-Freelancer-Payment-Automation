const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleValidation, uuidParam, emailBody, amountBody, titleBody, textBody, deliverableBody, body } = require('../middleware/validate');
const { errorMessage } = require('../middleware/logger');

const router = express.Router();

const MAX_MILESTONES = 20;
const MAX_TOTAL = 100000;

router.post(
  '/projects',
  emailBody('client_email'),
  emailBody('freelancer_email'),
  titleBody('title'),
  textBody('description', 1, 5000),
  amountBody('total_amount'),
  body('milestones')
    .isArray({ min: 1, max: MAX_MILESTONES })
    .withMessage(`milestones must be array of 1-${MAX_MILESTONES} items`),
  body('milestones.*.title').trim().isLength({ min: 1, max: 200 }).withMessage('milestone title must be 1-200 chars').escape(),
  body('milestones.*.amount')
    .custom((v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new Error('milestone amount must be positive');
      if (n > MAX_TOTAL) throw new Error('milestone amount exceeds maximum');
      return true;
    }),
  handleValidation,
  (req, res) => {
    try {
      const { client_email, freelancer_email, title, description, total_amount, milestones } = req.body;
      const total = Number(total_amount);
      if (total > MAX_TOTAL) return res.status(400).json({ error: 'total_amount exceeds maximum allowed ($100,000).' });

      const projectId = uuidv4();
      const milestoneRows = milestones.map((m) => {
        const amt = Number(m.amount);
        return { id: uuidv4(), project_id: projectId, title: m.title, amount: amt };
      });

      const createTx = db.transaction(() => {
        db.prepare(
          `INSERT INTO projects (id, client_email, freelancer_email, title, description, total_amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP)`
        ).run(projectId, client_email, freelancer_email, title, description, total);

        const insertMs = db.prepare(
          `INSERT INTO milestones (id, project_id, title, amount, status, created_at)
           VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
        );
        for (const ms of milestoneRows) insertMs.run(ms.id, ms.project_id, ms.title, ms.amount);
      });
      createTx();

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      const createdMilestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
      res.status(201).json({ ...project, milestones: createdMilestones });
    } catch (err) {
      console.error('[POST /api/projects]', errorMessage(err));
      res.status(500).json({ error: 'Failed to create project.' });
    }
  }
);

router.get('/projects', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json(projects);
  } catch (err) {
    console.error('[GET /api/projects]', errorMessage(err));
    res.status(500).json({ error: 'Failed to list projects.' });
  }
});

router.get('/projects/:id', uuidParam('id'), handleValidation, (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...project, milestones });
  } catch (err) {
    console.error('[GET /api/projects/:id]', errorMessage(err));
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

router.post('/milestones/:id/submit', uuidParam('id'), deliverableBody, handleValidation, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Milestone not found.' });
    if (existing.status === 'paid') return res.status(409).json({ error: 'Milestone already paid, cannot resubmit.' });

    db.prepare(`UPDATE milestones SET deliverable_text = ?, status = 'submitted', ai_score = NULL, ai_feedback = NULL WHERE id = ?`).run(
      req.body.deliverable_text,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[POST /api/milestones/:id/submit]', errorMessage(err));
    res.status(500).json({ error: 'Failed to submit deliverable.' });
  }
});

router.get('/payments', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const payments = db
      .prepare(
        `SELECT p.*, m.title AS milestone_title, pr.title AS project_title
         FROM payments p
         JOIN milestones m ON p.milestone_id = m.id
         JOIN projects pr ON m.project_id = pr.id
         ORDER BY p.paid_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset);
    res.json(payments);
  } catch (err) {
    console.error('[GET /api/payments]', errorMessage(err));
    res.status(500).json({ error: 'Failed to list payments.' });
  }
});

module.exports = router;
