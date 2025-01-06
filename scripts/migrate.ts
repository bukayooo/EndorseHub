import { migrateSchema } from '../db/schema';

async function main() {
  try {
    await migrateSchema();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 