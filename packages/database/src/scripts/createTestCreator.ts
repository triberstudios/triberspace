import { db, creators } from '../index';
import { eq } from 'drizzle-orm';

async function createTestCreator() {
  console.log('Creating test creator...');

  try {
    const [existingCreator] = await db
      .select()
      .from(creators)
      .where(eq(creators.userId, 'dev-user-123'))
      .limit(1);

    if (existingCreator) {
      console.log('✓ Test creator already exists:', existingCreator.publicId);
      process.exit(0);
    }

    const [newCreator] = await db.insert(creators).values({
      userId: 'dev-user-123',
      bio: 'Test creator for development'
    }).returning();

    console.log('✅ Test creator created:', newCreator.publicId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test creator:', error);
    process.exit(1);
  }
}

createTestCreator();
