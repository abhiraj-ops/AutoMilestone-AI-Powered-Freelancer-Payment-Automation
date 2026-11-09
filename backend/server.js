require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const projectsRouter = require('./routes/projects');
const geminiRouter = require('./routes/gemini');
const paypalRouter = require('./routes/paypal');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'automilestone-backend' });
});

app.use('/api', projectsRouter);
app.use('/api', geminiRouter);
app.use('/api', paypalRouter);
app.use('/api', webhooksRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AutoMilestone backend listening on http://localhost:${PORT}`);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('DB tables:', tables.map((t) => t.name).join(', '));
});
