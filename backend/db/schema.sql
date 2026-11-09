CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_email TEXT NOT NULL,
  freelancer_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paypal_order_id TEXT,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  deliverable_text TEXT,
  ai_score INTEGER,
  ai_feedback TEXT,
  payout_batch_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL,
  amount REAL NOT NULL,
  paypal_payout_id TEXT,
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);
