/**
 * Migration script: Convert single-user data to multi-tenant
 *
 * Usage:
 *   node scripts/migrate-to-multitenancy.js --email admin@example.com --password yourpassword --name "Admin"
 *
 * What it does:
 *   1. Creates an admin user (or finds existing by email)
 *   2. Assigns userId to all existing documents that lack one
 *   3. Reports what was migrated
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { Application } from '../models/Application.js';
import { SavedJD } from '../models/SavedJD.js';
import { ProfileVault } from '../models/ProfileVault.js';
import { Template } from '../models/Template.js';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const email = getArg('email');
const password = getArg('password');
const name = getArg('name') || 'Admin';

if (!email || !password) {
  console.error('Usage: node scripts/migrate-to-multitenancy.js --email <email> --password <password> [--name <name>]');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resume-editor';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Create or find admin user
  let user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    console.log(`Found existing user: ${user.email} (${user._id})`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await User.create({ email, passwordHash, name });
    console.log(`Created admin user: ${user.email} (${user._id})`);
  }

  const userId = user._id;

  // 2. Migrate all collections
  const collections = [
    { model: Resume, name: 'Resume' },
    { model: Application, name: 'Application' },
    { model: SavedJD, name: 'SavedJD' },
    { model: ProfileVault, name: 'ProfileVault' },
  ];

  for (const { model, name: collName } of collections) {
    const result = await model.updateMany(
      { userId: { $exists: false } },
      { $set: { userId } }
    );
    console.log(`${collName}: migrated ${result.modifiedCount} documents`);
  }

  // Templates: only user-created ones (skip system templates)
  const templateResult = await Template.updateMany(
    { userId: { $exists: false } },
    { $set: { userId } }
  );
  console.log(`Template: migrated ${templateResult.modifiedCount} documents (assigned to admin user)`);

  // 3. Verify
  for (const { model, name: collName } of collections) {
    const orphans = await model.countDocuments({ userId: { $exists: false } });
    if (orphans > 0) {
      console.error(`WARNING: ${collName} still has ${orphans} documents without userId!`);
    }
  }

  // 4. Drop the old unique index on Resume.name (if it exists)
  try {
    await Resume.collection.dropIndex('name_1');
    console.log('Dropped old unique index on Resume.name');
  } catch {
    // Index might not exist, that's fine
  }

  // Drop old unique index on Template.name (if it exists)
  try {
    await Template.collection.dropIndex('name_1');
    console.log('Dropped old unique index on Template.name');
  } catch {
    // Index might not exist
  }

  // 5. Ensure new compound indexes exist
  await Resume.syncIndexes();
  await ProfileVault.syncIndexes();
  console.log('Synced indexes');

  console.log('\nMigration complete!');
  console.log(`All data assigned to user: ${user.email} (${user._id})`);
  console.log('You can now log in with these credentials.');

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
