import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedBook } from "../src/seed/seed";

const prisma = new PrismaClient();

async function main() {
  await seedBook(prisma);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
