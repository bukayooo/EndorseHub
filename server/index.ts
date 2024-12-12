import { createApp } from './app';
import { setupDb } from './db';

// Set environment
const NODE_ENV = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = NODE_ENV;

// Essential environment variables
const PORT = parseInt(process.env.PORT || '3001', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'development_secret_key';
process.env.SESSION_SECRET = SESSION_SECRET;

console.log('Environment configuration:', {
  NODE_ENV,
  PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '✓' : '✗',
  SESSION_SECRET: SESSION_SECRET ? '✓' : '✗'
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Server configuration
const port = parseInt(process.env.PORT || '3001', 10);
const host = '0.0.0.0';

// Kill any existing servers on the port
// Handle server shutdown
let server: any = null;

async function shutdown(signal?: string) {
  console.log(`Shutting down server${signal ? ` (${signal})` : ''}...`);
  
  if (server) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => err ? reject(err) : resolve());
      });
      console.log('Server closed gracefully');
    } catch (err) {
      console.error('Error during server shutdown:', err);
    }
  }
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  shutdown();
});

console.log('Starting server with configuration:', {
  environment: NODE_ENV,
  port,
  host
});

async function main() {
  try {
    await setupDb();
    console.log('Database connection established');

    // Create and configure Express application with proper error handling
    const app = await createApp().catch(error => {
      console.error('Failed to create application:', error);
      process.exit(1);
    });
    
    // Start server with proper error handling
    const host = '0.0.0.0';
    server = app.listen(port, host, () => {
      console.log(`API Server running at http://${host}:${port}`);
      console.log(`Environment: ${NODE_ENV}`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        shutdown();
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    server.on('error', (error: Error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Fatal server error:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

main();