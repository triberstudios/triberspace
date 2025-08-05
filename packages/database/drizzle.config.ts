import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'path';

// Load .env from root directory
config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/*',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
