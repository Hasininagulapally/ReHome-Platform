import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Configure CORS — explicit allowlist, env-driven (never allow arbitrary origins)
const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const devOrigins =
  process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']
    : [];

const allowedOrigins = [...new Set([...parseOrigins(process.env.CLIENT_URL), ...devOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, server-to-server) have no Origin header
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
  })
);

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});

// Body parsing with strict limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle invalid JSON syntax in request body (return JSON 400 instead of crash/stack trace)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body'
    });
  }
  next(err);
});

// Serve uploaded images statically
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(uploadDir, {
    dotfiles: 'ignore',
    index: false
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'ReHome Backend API',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount application API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
