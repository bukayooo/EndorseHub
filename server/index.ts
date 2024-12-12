import { createApp } from './app';
import { setupDb } from './db';

const port = Number(process.env.PORT) || 3000;

async function main() {
  try {
    console.log('Starting server initialization...');
    
    // Initialize database connection
    console.log('Establishing database connection...');
    const dbConnected = await setupDb();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Create and configure Express application
    console.log('Creating Express application...');
    const app = await createApp();
    
    // Start server
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
