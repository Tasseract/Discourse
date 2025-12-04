#!/usr/bin/env node
// idempotent migration: unset the `isGlobal` field on all channel documents
// Usage (Windows cmd.exe):
//   set MONGODB_URI=mongodb+srv://...    (or set in your env)
//   node scripts\unset-isGlobal.mjs

import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI environment variable. Set it and re-run.');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db();
    const channels = db.collection('channels');

    // Find how many docs currently have isGlobal
    const have = await channels.find({ isGlobal: { $exists: true } }).toArray();
    if (have.length === 0) {
      console.log('No channel documents contained isGlobal. Nothing to do.');
      return;
    }

    console.log(`Found ${have.length} channel(s) with isGlobal. Listing slugs/names:`);
    have.forEach((c) => console.log(`  - ${c.slug ?? c.name ?? c._id}`));

    // Confirm before running
    // To support non-interactive use, honor SKIP_CONFIRM=1
    const skip = process.env.SKIP_CONFIRM === '1';
    if (!skip) {
      // simple prompt
      const answer = await new Promise((res) => {
        process.stdout.write('Proceed to unset isGlobal on these documents? (y/N): ');
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', (d) => res(String(d).trim()));
      });
      if (String(answer).toLowerCase() !== 'y') {
        console.log('Aborted by user.');
        return;
      }
    }

    const result = await channels.updateMany({ isGlobal: { $exists: true } }, { $unset: { isGlobal: '' } });
    console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}.`);
    console.log('Migration complete. Consider taking a DB backup before running in production.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  } finally {
    await client.close();
  }
}

main();
