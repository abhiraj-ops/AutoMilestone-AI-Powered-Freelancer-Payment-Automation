const { body, param, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map((e) => e.msg) });
  }
  next();
}

// Shared chains
const uuidParam = (name = 'id') => param(name).isUUID().withMessage('Invalid id format');
const emailBody = (field) =>
  body(field)
    .trim()
    .toLowerCase()
    .isEmail().withMessage(`${field} must be a valid email`)
    .isLength({ max: 254 }).withMessage(`${field} too long`);
const amountBody = (field = 'total_amount') =>
  body(field)
    .custom((v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be a positive number`);
      if (n > 100000) throw new Error(`${field} exceeds maximum allowed ($100,000)`);
      return true;
    });
const titleBody = (field) =>
  body(field).trim().isLength({ min: 1, max: 200 }).withMessage(`${field} must be 1-200 characters`).escape();
const textBody = (field, min = 1, max = 10000) =>
  body(field).trim().isLength({ min, max }).withMessage(`${field} must be ${min}-${max} characters`).escape();
const deliverableBody = body('deliverable_text')
  .trim()
  .isLength({ min: 10, max: 20000 }).withMessage('deliverable_text must be 10-20000 characters')
  .escape();

// NOTE: .escape() encodes HTML entities to mitigate stored XSS when later rendered as HTML.
// Frontend renders as text (React escapes), so this is defense-in-depth.

module.exports = {
  handleValidation,
  uuidParam,
  emailBody,
  amountBody,
  titleBody,
  textBody,
  deliverableBody,
  body,
  param,
};
