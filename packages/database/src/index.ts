import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolve } from 'path';
import * as schema from './db/schema';

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

export const db = drizzle(process.env.DATABASE_URL!, { schema });

export * from './db/schema';
