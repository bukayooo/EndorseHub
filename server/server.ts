import { createApp } from './app';
import { setupDb } from './db';

const port = Number(process.env.PORT) || 3000;

async function main() {
  await setupDb();
  const app = await createApp();
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

main().catch(console.error);
