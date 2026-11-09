require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { requestLogger } = require('./middleware/logger');
const { requireApiKey } = require('./middleware/apiKey');
const projectsRouter = require('./routes/projects');
const geminiRouter = require('./routes/gemini');
const paypalRouter = require('./routes/paypal');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for correct client IPs on Render (needed for rate-limit + logs)
app.set('trust proxy', 1);

// Startup env validation (fail fast in production)
function validateEnv() {
  const required = [];
  if (NODE_ENV === 'production') {
    required.push('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'GEMINI_API_KEY', 'FRONTEND_URL');
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      console.error(`[startup] Missing required env vars for production: ${missing.join(', ')}`);
      process.exit(1);
    }
  } else {
    if (!process.env.GEMINI_API_KEY) console.warn('[startup] GEMINI_API_KEY not set — AI will return graceful fallback');
    if (!process.env.PAYPAL_CLIENT_ID) console.warn('[startup] PAYPAL_CLIENT_ID not set — PayPal calls will fail');
  }
}
validateEnv();

// Security headers (CSP relaxed for PayPal JS SDK; adjust for your deployment)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api-m.sandbox.paypal.com', 'https://*.paypal.com', 'https://*.paypalobjects.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.paypal.com', 'https://*.paypal.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.paypalobjects.com'],
      frameSrc: ['https://www.paypal.com', 'https://*.paypal.com'],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS whitelist
const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400,
}));

app.use(requestLogger);
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'automilestone-backend', env: NODE_ENV });
});

app.use('/api', generalLimiter);
app.use('/api', requireApiKey);

app.use('/api', writeLimiter, projectsRouter);
app.use('/api', sensitiveLimiter, geminiRouter);
app.use('/api', sensitiveLimiter, paypalRouter);
// Webhook is signed by PayPal, exclude from API-key gate
app.use('/api', webhooksRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error('[Unhandled]', err && err.stack ? err.stack : err);
  const status = err.status || err.statusCode || 500;
  const message = NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`AutoMilestone backend listening on http://localhost:${PORT}`);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('DB tables:', tables.map((t) => t.name).join(', '));
});

function shutdown(signal) {
  console.log(`[shutdown] ${signal} received, closing...`);
  server.close(() => {
    try { db.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
