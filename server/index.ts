import { createApp, startServer } from './app';
import { setupDb } from './db';

async function bootstrap() {
  try {
    // Initialize database connection
    await setupDb();
    
    // Create Express application
    const app = await createApp();
    
    // Start server
    await startServer(app);
  } catch (error) {
    console.error('Failed to bootstrap application:', error);
    process.exit(1);
  }
}

// Start application
bootstrap().catch((error) => {
  console.error('Unhandled bootstrap error:', error);
  process.exit(1);
});