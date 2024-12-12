import { createServer } from 'http';
import { createApp } from './app';
import { setupDb } from './db';

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : Number(process.env.PORT);

async function bootstrap() {
  try {
    console.log('Starting API server bootstrap...');
    
    // Initialize database connection
    console.log('Setting up database connection...');
    await setupDb();
    console.log('Database connection established');
    
    // Create Express application
    const app = await createApp();
    
    // Global error handling middleware
    app.use((err: Error, _req: any, res: any, _next: any) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: isDev ? err.message : undefined
      });
    });

    // Create and start HTTP server
    const server = createServer(app);
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`API server listening on port ${PORT}`);
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to bootstrap API server:', error);
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Start API server
bootstrap().catch((error) => {
  console.error('Unhandled bootstrap error:', error);
  console.error(error.stack);  // Log full stack trace
  process.exit(1);
});

// Handle promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
