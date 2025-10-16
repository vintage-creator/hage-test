// scripts/delete-user.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'chuksy3@gmail.com';

  // Find the user first
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`No user found with email: ${email}`);
    return;
  }

  // Delete related tokens first
  await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  // Delete the user
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`User with email ${email} and related tokens deleted successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
