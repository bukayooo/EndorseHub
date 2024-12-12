import { createApp } from './app';
import { setupDb } from './db';

const port = Number(process.env.PORT) || 3000;

async function main() {
  try {
    console.log('Starting server initialization...');
    
    // Initialize database first
    await setupDb();
    
    // Create and start Express app
    const app = await createApp();

    // Start server with proper error handling
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });

    server.on('error', (error: Error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Fatal error during startup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Start server
main();
