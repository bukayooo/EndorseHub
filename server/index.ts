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
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Fatal error during startup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Start server
main();
