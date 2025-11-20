import { db } from '../index';
import { pointPackages } from '../db/schema/triberPoints';

/**
 * Seed the standard 5 Triber Point packages
 * 1,000 points = $1 USD
 */
async function seedPointPackages() {
  console.log('🌱 Seeding point packages...');

  try {
    // Delete existing packages (for idempotency)
    await db.delete(pointPackages);
    console.log('✓ Cleared existing packages');

    // Insert the 5 standard tiers
    const packages = await db.insert(pointPackages).values([
      {
        publicId: 'pkg_starter',
        name: 'Starter',
        basePoints: 5000,
        bonusPoints: 0,
        bonusPercent: 0,
        priceUSD: '5.00',
        displayOrder: 1,
        isActive: true
      },
      {
        publicId: 'pkg_standard',
        name: 'Standard',
        basePoints: 10000,
        bonusPoints: 500,
        bonusPercent: 5,
        priceUSD: '10.00',
        displayOrder: 2,
        isActive: true
      },
      {
        publicId: 'pkg_plus',
        name: 'Plus',
        basePoints: 25000,
        bonusPoints: 2500,
        bonusPercent: 10,
        priceUSD: '25.00',
        displayOrder: 3,
        isActive: true
      },
      {
        publicId: 'pkg_premium',
        name: 'Premium',
        basePoints: 50000,
        bonusPoints: 7500,
        bonusPercent: 15,
        priceUSD: '50.00',
        displayOrder: 4,
        isActive: true
      },
      {
        publicId: 'pkg_ultimate',
        name: 'Ultimate',
        basePoints: 100000,
        bonusPoints: 20000,
        bonusPercent: 20,
        priceUSD: '100.00',
        displayOrder: 5,
        isActive: true
      }
    ]).returning();

    console.log(`✅ Seeded ${packages.length} point packages:`);
    packages.forEach(pkg => {
      const total = pkg.basePoints + pkg.bonusPoints;
      console.log(`  - ${pkg.name}: ${pkg.basePoints.toLocaleString()} + ${pkg.bonusPoints.toLocaleString()} = ${total.toLocaleString()} points ($${pkg.priceUSD})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding point packages:', error);
    process.exit(1);
  }
}

seedPointPackages();
