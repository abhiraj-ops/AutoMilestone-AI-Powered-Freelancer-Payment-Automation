const SENSITIVE_KEYS = ['authorization', 'token', 'secret', 'password', 'api_key', 'apikey', 'x-api-key'];

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (SENSITIVE_KEYS.includes(lk) || lk.includes('secret')) out[k] = '[REDACTED]';
    else if (typeof v === 'object' && v !== null) out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

function errorMessage(err) {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  return String(err);
}

function requestLogger(req, _res, next) {
  const started = Date.now();
  const { method, url, ip } = req;
  // never log bodies / auth headers for sensitive routes
  console.log(`[req] ${method} ${url} ${ip} ${started}`);
  next();
}

module.exports = { redact, errorMessage, requestLogger };
