import { createServer } from 'http';
import { createApp } from './app';
import { setupDb } from './db';

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : Number(process.env.PORT);

async function bootstrap() {
  try {
    console.log('Starting application bootstrap...');
    
    // Initialize database connection
    console.log('Setting up database connection...');
    await setupDb();
    console.log('Database connection established');
    
    // Create Express application
    const app = await createApp();
    
    // Error handling middleware
    app.use((err: Error, _req: any, res: any, _next: any) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Create and start HTTP server
    const server = createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`Server listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to bootstrap application:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Start application
bootstrap().catch((error) => {
  console.error('Unhandled bootstrap error:', error);
  process.exit(1);
});
