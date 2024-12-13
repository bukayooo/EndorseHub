import { createApp } from './app';

async function startServer() {
  try {
    const app = await createApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] Listening on port ${port}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer()
  .catch(error => {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  });