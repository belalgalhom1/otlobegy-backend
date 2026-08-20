import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'newadmin@example.com';
  const password = process.argv[3] || 'password123';
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Otlob',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      language: 'EN',
    },
  });
  
  console.log('Successfully created user:');
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
