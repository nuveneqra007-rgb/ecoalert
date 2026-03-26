// ══════════════════════════════════════════════
// server.js — EcoAlert Production Server
// ══════════════════════════════════════════════
require('dotenv').config();

const express         = require('express');
const helmet          = require('helmet');
const cors            = require('cors');
const compression     = require('compression');
const mongoSanitize   = require('express-mongo-sanitize');
const rateLimit       = require('express-rate-limit');
const morgan          = require('morgan');
const path            = require('path');

const connectDB      = require('./config/db');
const { verifyCloudinary } = require('./config/cloudinary');
const { initFirebase }     = require('./config/firebase');
const logger         = require('./utils/logger');
const errorHandler   = require('./middleware/errorHandler');
const { AppError }   = require('./utils/AppError');
const { getAIStatus } = require('./services/aiService');

const authRoutes   = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes   = require('./routes/userRoutes');
const aiRoutes     = require('./routes/aiRoutes');

// ── INIT APP ───────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── CONNECT SERVICES ───────────────────────────
connectDB();
verifyCloudinary();
initFirebase();

// ── SECURITY MIDDLEWARES ───────────────────────

// Helmet — HTTP security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from other origins
}));

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5500')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: Origen no permitido — ${origin}`));
  },
  methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization', 'X-Device-Id'],
  exposedHeaders:   ['X-Total-Count'],
  credentials:      true,
}));

// Rate limiting — prevenir brute force
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
  skip: (req) => req.path === '/health', // health check siempre pasa
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,                   // máx 10 intentos de login por IP
  message: { success: false, message: 'Demasiados intentos de autenticación.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── GENERAL MIDDLEWARES ────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize()); // Prevenir inyección NoSQL
app.use(morgan('combined', { stream: logger.stream }));

// Servir uploads locales como estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ── API ROUTES ────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/ai',      aiRoutes);

// ── AI STATUS ─────────────────────────────────
app.get('/api/ai/status', (req, res) => {
  res.json(getAIStatus());
});

// ── HEALTH CHECK (para Render / Railway) ──────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status:   'ok',
    uptime:   Math.floor(process.uptime()),
    env:      process.env.NODE_ENV,
    mongo:    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version:  '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── ROOT ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'EcoAlert API v2',
    status: 'running',
    docs:   '/health',
    endpoints: {
      auth:    '/api/auth',
      reports: '/api/reports',
      users:   '/api/users',
      ai:      '/api/ai/status',
    },
  });
});

// ── 404 ───────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
});

// ── GLOBAL ERROR HANDLER ──────────────────────
app.use(errorHandler);

// ── UNCAUGHT EXCEPTIONS ───────────────────────
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — cerrando proceso', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION', { reason: String(reason) });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido — cerrando servidor gracefully');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

// ── START ─────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`\n  🌱  EcoAlert API v2.0 — puerto ${PORT} — ${process.env.NODE_ENV}\n`);
});

module.exports = app;
