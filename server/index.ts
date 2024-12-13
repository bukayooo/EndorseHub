import { createApp } from './app';
import { checkConnection, closeDb } from './db';

async function startServer() {
  let server;
  try {
    console.log('[Server] Starting server initialization...');
    
    // Verify database connection before proceeding
    console.log('[Server] Verifying database connection...');
    if (!await checkConnection()) {
      throw new Error('Database connection verification failed');
    }
    
    const app = await createApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
    
    // Add unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    server = await new Promise((resolve, reject) => {
      try {
        const serverInstance = app.listen(port, '0.0.0.0', () => {
          console.log(`[Server] Successfully listening on port ${port}`);
          resolve(serverInstance);
        });

        serverInstance.on('error', (err) => {
          console.error('[Server] Server failed to start:', err);
          reject(err);
        });
      } catch (err) {
        console.error('[Server] Failed to create server instance:', err);
        reject(err);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => handleShutdown(server));
    process.on('SIGINT', () => handleShutdown(server));
    
    return server;
  } catch (error) {
    console.error('[Server] Critical error during server creation:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      additional: error
    });
    if (server) {
      await handleShutdown(server);
    }
    throw error;
  }
}

async function handleShutdown(server) {
  console.log('[Server] Shutting down gracefully...');
  try {
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
    console.log('[Server] Shutdown completed successfully');
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
  }
  process.exit(0);
}

startServer()
  .catch(error => {
    console.error('[Server] Fatal error during startup:', error);
    console.error('[Server] Stack trace:', error?.stack);
    process.exit(1);
  });