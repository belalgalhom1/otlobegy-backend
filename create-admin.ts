import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: npx ts-node create-admin.ts [email] [password] [name] [phone]');
    console.log('Defaults:');
    console.log('  email:    newadmin@example.com');
    console.log('  password: password123');
    console.log('  name:     Otlob Admin');
    console.log('  phone:    +1234567890');
    process.exit(0);
  }

  const email = process.argv[2] || 'newadmin@example.com';
  const password = process.argv[3] || 'password123';
  const name = process.argv[4] || 'Otlob Admin';
  const phone = process.argv[5] || '+1234567890';
  
  console.log(`Checking admin user: ${email}...`);

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      phone,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      isPhoneVerified: true,
    },
    create: {
      email,
      phone,
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      isPhoneVerified: true,
      language: 'EN',
    },
  });
  
  console.log('✅ Successfully configured SUPER_ADMIN:');
  console.log(`   Email:    ${user.email}`);
  console.log(`   Phone:    ${user.phone}`);
  console.log(`   Password: ${password}`);
  console.log(`   Name:     ${user.name}`);
  console.log('You can now log in to the admin panel with these credentials.');
}

main()
  .catch(e => {
    console.error('❌ Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
