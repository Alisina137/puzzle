import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the global object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.();
    console.log('? Database connected successfully');
    return true;
  } catch (error) {
    console.error('? Database connection failed:', error);
    return false;
  }
}

// Helper function to disconnect
export async function disconnectDatabase(): Promise<void> {
  await prisma.();
}