import { createApp } from './app';
import { setupDb } from './db';

const port = Number(process.env.PORT) || 3000;

async function main() {
  try {
    // Initialize database connection
    await setupDb();
    
    // Create and configure Express app
    const app = await createApp();
    
    // Start server
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
