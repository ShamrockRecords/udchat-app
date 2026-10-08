const { randomBytes, timingSafeEqual } = require('node:crypto');
const createError = require('http-errors');

function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      !equalSecret(req.get('X-CSRF-Token') || req.body?._csrf, req.session.csrfToken)) {
    return next(createError(403, 'Please reload the page and try again.'));
  }
  next();
}
function documentId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) {
    throw createError(400, 'Invalid chat ID.');
  }
  return value;
}
function textField(value, maxLength, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > maxLength || (required && !value.trim())) {
    throw createError(400, 'Invalid input.');
  }
  return value;
}
function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
module.exports = { equalSecret, csrfProtection, documentId, textField, jsonForScript };
