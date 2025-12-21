#!/usr/bin/env npx tsx
/**
 * Production Database Seed Script
 * 
 * This script seeds demo data into the production database.
 * 
 * Usage:
 *   1. Make sure you have the production DATABASE_URL set
 *   2. Run: npx tsx server/seed-production.ts <organizationId> <userId>
 * 
 * Example:
 *   npx tsx server/seed-production.ts "org_abc123" "user_xyz789"
 * 
 * To find your organization ID and user ID:
 *   - Check the organizations and users tables in your database
 *   - Or look at the network requests in your browser dev tools
 */

import { db } from "./db";
import { seedAIGTMSummit } from "./demo-seed";
import { organizations, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n📋 Production Seed Script");
    console.log("========================\n");
    
    console.log("Fetching available organizations and users...\n");
    
    const orgs = await db.select({ 
      id: organizations.id, 
      name: organizations.name 
    }).from(organizations).limit(10);
    
    const userList = await db.select({ 
      id: users.id, 
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName
    }).from(users).limit(10);
    
    if (orgs.length === 0) {
      console.log("❌ No organizations found. Please create an organization first.\n");
      process.exit(1);
    }
    
    console.log("Available Organizations:");
    orgs.forEach(org => {
      console.log(`  • ${org.name}: ${org.id}`);
    });
    
    console.log("\nAvailable Users:");
    userList.forEach(user => {
      console.log(`  • ${user.firstName} ${user.lastName} (${user.email}): ${user.id}`);
    });
    
    console.log("\n📝 Usage:");
    console.log("  npx tsx server/seed-production.ts <organizationId> <userId>\n");
    console.log("Example:");
    if (orgs.length > 0 && userList.length > 0) {
      console.log(`  npx tsx server/seed-production.ts "${orgs[0].id}" "${userList[0].id}"\n`);
    }
    
    process.exit(0);
  }
  
  if (args.length < 2) {
    console.error("❌ Error: Please provide both organizationId and userId");
    console.error("Usage: npx tsx server/seed-production.ts <organizationId> <userId>");
    process.exit(1);
  }
  
  const [organizationId, userId] = args;
  
  console.log("\n🌱 Starting production seed...");
  console.log(`   Organization ID: ${organizationId}`);
  console.log(`   User ID: ${userId}\n`);
  
  try {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (org.length === 0) {
      console.error(`❌ Organization not found: ${organizationId}`);
      process.exit(1);
    }
    
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }
    
    console.log(`✓ Found organization: ${org[0].name}`);
    console.log(`✓ Found user: ${user[0].firstName} ${user[0].lastName}\n`);
    
    const result = await seedAIGTMSummit(organizationId, userId);
    
    console.log("\n✅ Seed completed successfully!");
    console.log(`   Event ID: ${result.eventId}`);
    console.log(`   Message: ${result.message}\n`);
    
  } catch (error: any) {
    console.error("\n❌ Seed failed:", error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
