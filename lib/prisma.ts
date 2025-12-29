import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pooling configuration
import { Prisma } from '@prisma/client';

const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === "development" 
    ? [{ level: 'query', emit: 'event' }, { level: 'error', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }]
    : [{ level: 'error', emit: 'stdout' }],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Configure connection pool
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  // Add connection pool parameters
  url.searchParams.set("connection_limit", "10");
  url.searchParams.set("pool_timeout", "20");
  process.env.DATABASE_URL = url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

