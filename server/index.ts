import { createApp } from './app';
import { checkConnection, closeDb } from './db';
import type { Server } from 'http';

let server: Server | null = null;

async function startServer() {
  try {
    // Verify database connection first
    console.log('[Server] Starting server initialization...');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Attempt database connection with retries
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!dbConnected && retryCount < maxRetries) {
      console.log(`[Server] Attempting database connection (attempt ${retryCount + 1}/${maxRetries})...`);
      dbConnected = await checkConnection();
      if (!dbConnected) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log('[Server] Connection failed, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!dbConnected) {
      throw new Error('Database connection verification failed after multiple attempts');
    }
    console.log('[Server] Database connection verified successfully');
    
    // Create and configure Express app
    console.log('[Server] Creating Express application...');
    const app = await createApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

    return new Promise((resolve, reject) => {
      try {
        // Start server with explicit host binding
        const host = '0.0.0.0';
        console.log(`[Server] Attempting to start server on ${host}:${port}`);
        server = app.listen(port, host, () => {
          console.log(`[Server] Server successfully started and listening on http://${host}:${port}`);
          resolve(server);
        });

        server.on('error', (error: Error) => {
          console.error('[Server] Server startup error:', error);
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
