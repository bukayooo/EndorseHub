import { createServer } from 'http';
import { createApp } from './app';
import { setupDb } from './db';

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : Number(process.env.PORT);

async function bootstrap() {
  try {
    // Initialize database and create app
    await setupDb();
    const app = await createApp();
    
    // Create and start server
    const server = createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running on port ${PORT} (${process.env.NODE_ENV})`);
    });

    // Simple error handling
    server.on('error', console.error);
    process.on('uncaughtException', console.error);
    process.on('unhandledRejection', console.error);
  } catch (error) {
    console.error('Server startup failed:', error);
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
