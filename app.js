const config = require('./models/config');
const express = require('express');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const logger = require('morgan');
const { rateLimit } = require('express-rate-limit');
const i18n = require('i18n');
const admin = require('firebase-admin');
const { csrfProtection, jsonForScript } = require('./models/security');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMINSDK_project_id,
      clientEmail: process.env.FIREBASE_ADMINSDK_client_email,
      privateKey: (process.env.FIREBASE_ADMINSDK_private_key || '').replace(/\\n/g, '\n'),
    }),
  });
}

const app = express();
app.disable('x-powered-by');
if (config.production) app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.locals.jsonForScript = jsonForScript;

logger.token('path', req => req.originalUrl.split('?')[0]);
app.use(logger(config.production ? ':method :path :status :response-time ms' : 'dev'));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  if (config.production && !req.secure) return res.redirect(308, config.rootURL + req.originalUrl);
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.production ? '1h' : 0 }));
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 50 }));
app.use(cookieParser());
// Only locale, CSRF token and notices belong here, never identity or passwords.
app.use(cookieSession({
  name: 'udchat', keys: [config.sessionSecret], maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true, secure: config.production, sameSite: 'lax',
}));
i18n.configure({
  locales: config.locales, defaultLocale: 'en', directory: path.join(__dirname, 'locales'),
  objectNotation: true, updateFiles: false,
});
app.use(i18n.init);
app.use((req, res, next) => {
  if (config.locales.includes(req.session.locale)) i18n.setLocale(req, req.session.locale);
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(csrfProtection);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: req => req.method !== 'POST',
});
app.use(['/signin', '/signup', '/reset_password', '/auth_done/verify', '/chat/passcode'], authLimiter);

for (const [url, route] of Object.entries({
  '/signin': 'signin', '/signup': 'signup', '/reset_password': 'resetPassword',
  '/': 'index', '/create': 'create', '/profile': 'profile', '/chat': 'chat',
  '/locale_change': 'localeChange', '/about': 'about', '/auth_done': 'authDone', '/redirect': 'redirect',
})) app.use(url, require('./routes/' + route));

app.use((req, res) => res.status(404).render('error', { message: 'Not Found', error: {} }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error('Request failed:', req.method, req.path, status, err.code || err.name);
  res.status(status).render('error', {
    message: config.production && status === 500 ? 'Internal Server Error' : err.message,
    error: config.production ? {} : err,
  });
});
module.exports = app;
