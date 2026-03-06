// Fix: Windows default DNS blocks MongoDB Atlas SRV lookups — use Google DNS instead
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

// Load environment variables FIRST before any other modules that need them
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const passport = require('./src/config/passport');

const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');
const { errorHandler } = require('./src/middleware/errorHandler');
const initSockets = require('./src/sockets');

const app = express();
const httpServer = http.createServer(app);

// Allow same origins as Express (localhost on any port) so socket.io works from 5173, 5174, etc.
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // server-to-server
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  // Allow Vercel preview deployments (*.vercel.app)
  if (origin && origin.endsWith('.vercel.app')) return true;
  if (origin === 'http://localhost:5173') return true;
  if (origin === 'http://localhost:5174') return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  if (origin.startsWith('http://localhost:')) return true;
  return false;
};

const allowedSocketOrigin = (origin, callback) => {
  callback(null, isAllowedOrigin(origin) ? origin : false);
};

const io = new Server(httpServer, {
  cors: {
    origin: allowedSocketOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    callback(null, isAllowedOrigin(origin) ? origin : false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Session for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nexusboard-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting for auth routes (more lenient in development)
// Google OAuth routes are excluded — they use a separate, more lenient limiter below.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 in dev, 10 in production
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.originalUrl;
    return (
      path.startsWith('/api/auth/google') ||
      path.startsWith('/api/auth/me') ||
      path.startsWith('/api/auth/logout')
    );
  },
});

// Google OAuth routes are browser redirects; give them their own generous limiter
// so that normal login + callback cycles (2 requests each) never hit the tight limit above.
const googleAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 30 : 200, // 30 logins / hour in production
  message: 'Too many Google sign-in attempts. Please wait and try again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Request timeout — prevents frontend from hanging indefinitely (Render free tier)
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: 'Request timed out. Please try again.' });
    }
  });
  next();
});

// Routes
app.use('/api/auth/google', googleAuthLimiter); // applied before the general auth limiter
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check: /health and /api/health so localhost:5000/health returns 200
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/', (req, res) => res.json({ app: 'NexusBoard API', health: '/health', api: '/api' }));

// Socket.io
initSockets(io);

// Error handler
app.use(errorHandler);

// Start HTTP server — try PORT first, then fallback ports if in use
const PORT = parseInt(process.env.PORT, 10) || 5000;
const FALLBACK_PORTS = [5001, 5002, 5003];

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      httpServer.removeListener('error', onError);
      if (err.code === 'EADDRINUSE') {
        const nextPort = port === PORT ? FALLBACK_PORTS[0] : FALLBACK_PORTS[FALLBACK_PORTS.indexOf(port) + 1];
        if (nextPort) {
          console.warn(`⚠️  Port ${port} in use, trying ${nextPort}...`);
          tryListen(nextPort).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      } else {
        reject(err);
      }
    };
    httpServer.once('error', onError);
    httpServer.listen(port, () => {
      httpServer.removeListener('error', onError);
      console.log(`🚀 Server running on http://localhost:${port}`);
      if (port !== PORT) {
        console.log(`   (Port ${PORT} was in use. In client/.env set VITE_API_URL=http://localhost:${port}/api and VITE_SOCKET_URL=http://localhost:${port})`);
      }
      resolve();
    });
  });
}

tryListen(PORT).catch((err) => {
  console.error('❌ Server failed to start:', err.message);
  console.error('   Try closing other apps using ports 5000–5003 or set PORT=5999 in .env');
  process.exit(1);
});

// Connect to MongoDB (non-blocking — DB failure won't crash the server)
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.warn('⚠️  Running without database — create/join room may fail until DB is available');
    });
} else {
  console.warn('⚠️  No MONGO_URI in .env — running without database');
}

// Log unhandled errors so the server doesn't exit silently
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at', promise, 'reason:', reason);
});

module.exports = { io };
