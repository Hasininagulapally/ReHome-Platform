import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Validate essential environment configuration
const validateConfig = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 8) {
    throw new Error('JWT_SECRET must be configured and at least 8 characters long in .env');
  }
};

// Connect to Database and start HTTP server
const startServer = async () => {
  try {
    validateConfig();
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[ReHome Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[ReHome Server] API Base URL: http://localhost:${PORT}/api`);
      console.log(`[ReHome Server] Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[ReHome Server] Port ${PORT} is already in use. Please free the port or select another PORT in .env.`);
      } else {
        console.error(`[ReHome Server] Server socket error: ${err.message}`);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n[ReHome Server] Received kill signal, shutting down gracefully...');
      server.close(() => {
        console.log('[ReHome Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`[ReHome Server] Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
