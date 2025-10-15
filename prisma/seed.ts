// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Hash helper
  const hash = async (plain: string) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
  };

  // Create admin user
  const adminPassword = await hash('AdminPassword123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hage.local' },
    update: {},
    create: {
      email: 'admin@hage.local',
      password: adminPassword,
      name: 'Hage Admin',
      role: 'ADMIN',
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create regular user
  const userPassword = await hash('UserPassword123!');
  const user = await prisma.user.upsert({
    where: { email: 'jane.doe@example.com' },
    update: {},
    create: {
      email: 'jane.doe@example.com',
      password: userPassword,
      name: 'Jane Doe',
      role: 'USER',
    },
  });
  console.log(`Created user: ${user.email}`);

  // Create a sample shipment for the user
  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber: `HAGE-${Date.now().toString().slice(-6)}`,
      origin: 'Lagos Warehouse',
      destination: 'Abuja Distribution Center',
      status: 'PENDING',
      estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
      customerId: user.id,
      events: {
        create: [
          { status: 'PENDING', location: 'Lagos Warehouse', note: 'Shipment created' },
        ],
      },
    },
    include: { events: true },
  });
  console.log(`Created shipment: ${shipment.trackingNumber}`);

  // Add another tracking event
  await prisma.trackingEvent.create({
    data: {
      shipmentId: shipment.id,
      status: 'IN_TRANSIT',
      location: 'On route to Abuja',
      note: 'Picked up by driver',
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
