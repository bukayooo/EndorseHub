import { createApp } from './app';
import { setupDb } from './db';

const port = Number(process.env.PORT) || 3000;

async function main() {
  try {
    await setupDb();
    const app = await createApp();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

main();
