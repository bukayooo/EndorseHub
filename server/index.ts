import { createApp } from './app';
import { checkConnection, closeDb } from './db';
import type { Server } from 'http';

let server: Server | null = null;

async function startServer() {
  try {
    // Verify database connection first
    console.log('[Server] Verifying database connection...');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      throw new Error('Database connection verification failed');
    }
    console.log('[Server] Database connection verified');
    
    // Create and configure Express app
    console.log('[Server] Creating Express application...');
    const app = await createApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

    return new Promise((resolve, reject) => {
      try {
        // Start server
        server = app.listen(port, '0.0.0.0', () => {
          console.log(`[Server] Successfully listening on port ${port}`);
          resolve(server);
        });

        server.on('error', (error) => {
          console.error('[Server] Server error:', error);
          reject(error);
        });

        // Add error handlers
        process.on('unhandledRejection', (reason, promise) => {
          console.error('[Server] Unhandled Rejection:', reason);
          console.error('[Server] Promise:', promise);
        });

        process.on('uncaughtException', async (error) => {
          console.error('[Server] Uncaught Exception:', error);
          await handleShutdown();
          process.exit(1);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
          console.log('[Server] Received SIGTERM signal');
          await handleShutdown();
        });

        process.on('SIGINT', async () => {
          console.log('[Server] Received SIGINT signal');
          await handleShutdown();
        });

      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.error('[Server] Critical error during startup:', error);
    await handleShutdown();
    throw error;
  }
}

async function handleShutdown() {
  console.log('[Server] Shutting down gracefully...');
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }
    await closeDb();
    console.log('[Server] Shutdown completed');
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
startServer().catch(async error => {
  console.error('[Server] Fatal error:', error);
  await handleShutdown();
  process.exit(1);
});
