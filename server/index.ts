import { createApp } from './app';
import { setupDb } from './db';
import { createServer } from 'http';
import { AddressInfo } from 'net';

// Environment configuration
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  SESSION_SECRET: process.env.SESSION_SECRET || 'development_secret_key',
  HOST: '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL
};

// Validate required environment variables
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Set environment variables
Object.entries(config).forEach(([key, value]) => {
  if (value !== undefined) {
    process.env[key] = value.toString();
  }
});

console.log('Environment configuration:', {
  NODE_ENV: config.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? '✓' : '✗',
  SESSION_SECRET: process.env.SESSION_SECRET ? '✓' : '✗',
  PORT: config.PORT
});

let server: ReturnType<typeof createServer> | null = null;

async function closeServer(): Promise<void> {
  if (!server) return;
  
  return new Promise((resolve) => {
    server!.close(() => resolve());
  });
}

async function shutdown(signal?: string): Promise<void> {
  console.log(`Shutting down server${signal ? ` (${signal})` : ''}...`);
  
  try {
    await closeServer();
    console.log('Server closed gracefully');
  } catch (err) {
    console.error('Error during server shutdown:', err);
  }
  
  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  shutdown();
});

async function startServer() {
  try {
    console.log('Starting server with configuration:', {
      environment: config.NODE_ENV,
      port: config.PORT,
      host: config.HOST
    });

    // Setup database first
    await setupDb();
    console.log('Database connection established');

    // Create and configure Express application
    const app = await createApp();
    
    // Create HTTP server
    server = createServer(app);

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${config.PORT} is already in use`);
        shutdown();
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    // Start listening
    server.listen(config.PORT, config.HOST, () => {
      const addr = server!.address() as AddressInfo;
      console.log(`API Server running at http://${config.HOST}:${addr.port}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

    return server;
  } catch (error) {
    console.error('Fatal server error:', error);
    process.exit(1);
  }
}

// Start the server
startServer();