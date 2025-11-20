import { db, user } from '../index';
import { eq } from 'drizzle-orm';

async function createTestUser() {
  console.log('Creating test user...');

  try {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, 'dev-user-123'))
      .limit(1);

    if (existingUser) {
      console.log('✓ Test user already exists');
      process.exit(0);
    }

    await db.insert(user).values({
      id: 'dev-user-123',
      name: 'Dev User',
      firstName: 'Dev',
      lastName: 'User',
      username: 'devuser',
      displayUsername: 'devuser',
      email: 'dev@triber.space',
      emailVerified: false,
      role: 'user'
    });

    console.log('✅ Test user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
