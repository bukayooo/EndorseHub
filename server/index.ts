
import { createApp } from './app';

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

async function main() {
  try {
    const app = await createApp();
    app.listen(port, host, () => {
      console.log(`Server running at http://${host}:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
