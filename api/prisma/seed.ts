import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import countries from './countries.json';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  await prisma.shiftType.createMany({
    data: [
      { id: 1, name: 'Fixed Shift', description: 'Same working hours every day' },
      { id: 2, name: 'Rotational Shift', description: 'Rotate between several shifts daily, weekly or monthly' },
      { id: 3, name: 'Flexible Shift', description: 'Work a set number of hours at any time of the day' },
    ],
    skipDuplicates: true,
  });
  await prisma.country.createMany({ data: (countries as string[]).map((name) => ({ name })), skipDuplicates: true });
  await prisma.businessCategory.createMany({
    data: ['Construction', 'Printing', 'Manufacturing', 'Logistics/Transport', 'Jewellery', 'Garments/Textiles', 'Hotel', 'Super Market', 'Retail', 'IT & Services', 'Healthcare', 'Education'].map((name) => ({ name })),
    skipDuplicates: true,
  });

  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@hajri.app').toLowerCase();
  await prisma.superAdmin.upsert({
    where: { email },
    create: { email, name: 'Super Admin', passwordHash: hashPassword(process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!') },
    update: {},
  });
  console.log(`Seeded reference data. Super admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
