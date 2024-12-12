import { createApp } from './app';
import { setupDb } from './db';

const port = 3000;

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
    const server = app.listen(port, host, () => {
      console.log(`API Server running at http://${host}:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
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