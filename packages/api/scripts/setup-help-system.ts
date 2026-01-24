/**
 * Setup Help System Script
 * Ensures help_topics table exists and seeds initial data
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

async function setupHelpSystem() {
  console.log('🚀 Setting up Help System...\n');

  try {
    // Step 1: Check if table exists
    console.log('1️⃣  Checking if help_topics table exists...');
    try {
      await prisma.$queryRaw`SELECT 1 FROM help_topics LIMIT 1`;
      console.log('   ✅ Table exists\n');
    } catch (error) {
      console.log('   ❌ Table does not exist. Creating...\n');

      // Step 2: Push schema to database
      console.log('2️⃣  Pushing schema to database...');
      execSync('npx prisma db push --skip-generate', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('   ✅ Schema pushed\n');

      // Step 3: Generate Prisma client
      console.log('3️⃣  Generating Prisma client...');
      execSync('npx prisma generate', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('   ✅ Client generated\n');
    }

    // Step 4: Check if data exists
    console.log('4️⃣  Checking for existing help topics...');
    const existingTopics = await prisma.helpTopic.count();

    if (existingTopics > 0) {
      console.log(`   ✅ Found ${existingTopics} topics. Skipping seed.\n`);
    } else {
      console.log('   ℹ️  No topics found. Seeding data...\n');

      // Step 5: Seed data
      console.log('5️⃣  Seeding help topics...');
      execSync('npx tsx prisma/seeds/help-topics.seed.ts', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('   ✅ Data seeded\n');
    }

    console.log('✅ Help system setup complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up help system:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupHelpSystem();
