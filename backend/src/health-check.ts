import { prisma } from "./db.js";

try {
  const [products, stores, businesses, loungeLeads] = await Promise.all([
    prisma.products.count(),
    prisma.stores.count(),
    prisma.businesses.count(),
    prisma.lounge_directory_leads.count(),
  ]);

  console.info("Supabase database connection is healthy.", {
    products,
    stores,
    businesses,
    loungeDirectoryLeads: loungeLeads,
  });
} catch (error) {
  console.error("Supabase database health check failed.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
