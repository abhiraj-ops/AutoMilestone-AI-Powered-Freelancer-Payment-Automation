const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

router.post('/projects', (req, res) => {
  try {
    const { client_email, freelancer_email, title, description, total_amount, milestones } = req.body;

    if (!client_email || !freelancer_email || !title || !description || total_amount == null) {
      return res.status(400).json({ error: 'client_email, freelancer_email, title, description, and total_amount are required.' });
    }

    if (!Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ error: 'milestones array with at least one item is required.' });
    }

    const total = Number(total_amount);
    if (Number.isNaN(total) || total <= 0) {
      return res.status(400).json({ error: 'total_amount must be a positive number.' });
    }

    const projectId = uuidv4();
    const milestoneRows = milestones.map((m) => {
      if (!m.title || m.amount == null) {
        throw new Error('Each milestone must have title and amount.');
      }
      const amt = Number(m.amount);
      if (Number.isNaN(amt) || amt <= 0) throw new Error('Milestone amount must be a positive number.');
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
      for (const ms of milestoneRows) {
        insertMs.run(ms.id, ms.project_id, ms.title, ms.amount);
      }
    });

    createTx();

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const createdMilestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at ASC').all(projectId);

    res.status(201).json({ ...project, milestones: createdMilestones });
  } catch (err) {
    console.error('[POST /api/projects]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    res.json(projects);
  } catch (err) {
    console.error('[GET /api/projects]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/projects/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const milestones = db
      .prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at ASC')
      .all(req.params.id);

    res.json({ ...project, milestones });
  } catch (err) {
    console.error('[GET /api/projects/:id]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/milestones/:id/submit', (req, res) => {
  try {
    const { deliverable_text } = req.body;
    if (!deliverable_text || !String(deliverable_text).trim()) {
      return res.status(400).json({ error: 'deliverable_text is required.' });
    }

    const existing = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Milestone not found.' });

    db.prepare(`UPDATE milestones SET deliverable_text = ?, status = 'submitted', ai_score = NULL, ai_feedback = NULL WHERE id = ?`).run(
      String(deliverable_text),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[POST /api/milestones/:id/submit]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/payments', (req, res) => {
  try {
    const payments = db
      .prepare(
        `SELECT p.*, m.title AS milestone_title, pr.title AS project_title
         FROM payments p
         JOIN milestones m ON p.milestone_id = m.id
         JOIN projects pr ON m.project_id = pr.id
         ORDER BY p.paid_at DESC`
      )
      .all();
    res.json(payments);
  } catch (err) {
    console.error('[GET /api/payments]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
