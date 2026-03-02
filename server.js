require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./db/init');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ---------- Security ----------
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.BASE_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Shumë kërkesa. Provo përsëri pas disa minutash.'
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Shumë tentativa hyrjeje. Provo përsëri pas 15 minutash.'
});

// ---------- Logging ----------
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ---------- Views & Static ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '7d' : 0
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------- Session ----------
app.use(session({
  secret: process.env.SESSION_SECRET || 'tiramoto-secret-2026-tirana',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: isProduction,
    sameSite: 'lax',
    httpOnly: true
  }
}));

// ---------- Passport ----------
app.use(passport.initialize());
app.use(function(req, res, next) {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => { cb(); };
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => { cb(); };
  }
  next();
});
app.use(passport.session());
require('./config/passport')(passport);

// ---------- Locals ----------
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.statusiLabel = (s) => ({
    'E_RE': 'E Re', 'NE_PRITJE': 'Në pritje', 'CAKTUAR': 'Caktuar', 'MARRE': 'Marrë',
    'DOREZUAR': 'Dorëzuar', 'ANULUAR': 'Anuluar'
  }[s] || s);
  res.locals.statusiBadge = (s) => ({
    'E_RE': 'info', 'NE_PRITJE': 'warning', 'CAKTUAR': 'warning', 'MARRE': 'primary',
    'DOREZUAR': 'success', 'ANULUAR': 'danger'
  }[s] || 'secondary');
  next();
});

// ---------- Health Check ----------
app.get('/health', async (req, res) => {
  try {
    const db = require('./db/init');
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database unreachable',
      timestamp: new Date().toISOString()
    });
  }
});

// ---------- Routes ----------
app.get('/', (req, res) => {
  if (!req.session.user) return res.render('home');
  const destinations = { klient: '/klient', korrier: '/korrier', admin: '/admin' };
  res.redirect(destinations[req.session.user.roli] || '/hyr');
});

const authRoutes = require('./routes/auth');
app.use('/hyr', authLimiter);
app.use('/regjistrohu', authLimiter);
app.use(authRoutes);
app.use('/klient', require('./routes/customer'));
app.use('/korrier', require('./routes/courier'));
app.use('/admin', require('./routes/admin'));

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('gabim', { mesazhi: 'Faqja nuk u gjet.' });
});

// ---------- Error Handler ----------
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(500).render('gabim', { mesazhi: 'Gabim i brendshëm i serverit.' });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      const base = process.env.BASE_URL || `http://localhost:${PORT}`;
      console.log(`[SERVER] TIRAMOTO running at ${base}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[SERVER] Health check: ${base}/health`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
