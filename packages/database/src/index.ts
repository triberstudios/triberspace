import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolve } from 'path';

// Import individual schema files
import * as auth from './db/schema/auth';
import * as avatars from './db/schema/avatars';
import * as creators from './db/schema/creators';
import * as worlds from './db/schema/worlds';
import * as points from './db/schema/points';
import * as store from './db/schema/store';
import * as analytics from './db/schema/analytics';
import * as relations from './db/schema/relations';

// Combine all schemas
const schema = {
  ...auth,
  ...avatars,
  ...creators,
  ...worlds,
  ...points,
  ...store,
  ...analytics,
  ...relations,
};

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Re-export all tables
export * from './db/schema/auth';
export * from './db/schema/avatars';
export * from './db/schema/creators';
export * from './db/schema/worlds';
export * from './db/schema/points';
export * from './db/schema/store';
export * from './db/schema/analytics';
export * from './db/schema/relations';
