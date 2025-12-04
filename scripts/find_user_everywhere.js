#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts\\find_user_everywhere.js <id>');
    process.exit(2);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI environment variable to your MongoDB connection string.');
    process.exit(2);
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const dbName = process.env.MONGODB_DB || 'better-auth';
  const db = client.db(dbName);

  console.log(`Connected to ${uri} DB:${dbName}`);
  const cols = await db.listCollections().toArray();
  const names = cols.map(c => c.name);
  console.log('Collections:', names.join(', '));

  const possibleObj = (() => { try { return new ObjectId(id); } catch (e) { return null; } })();

  function valueMatches(val) {
    if (val == null) return false;
    if (typeof val === 'string' && val === id) return true;
    if (typeof val === 'object' && val !== null) {
      if (possibleObj && val instanceof ObjectId && val.equals(possibleObj)) return true;
      if (Array.isArray(val)) return val.some(valueMatches);
      for (const k of Object.keys(val)) if (valueMatches(val[k])) return true;
    }
    return false;
  }

  const limit = 500;
  const matches = {};
  for (const name of names) {
    try {
      const coll = db.collection(name);
      const docs = await coll.find({}).limit(limit).toArray();
      for (const d of docs) {
        if (valueMatches(d)) {
          if (!matches[name]) matches[name] = [];
          // sanitize a bit
          const copy = {};
          for (const k of Object.keys(d)) {
            try { copy[k] = JSON.parse(JSON.stringify(d[k])); } catch (e) { copy[k] = String(d[k]); }
          }
          matches[name].push(copy);
        }
      }
    } catch (e) {
      console.error('Skipping', name, e.message);
    }
  }

  console.log(JSON.stringify({ scanned: names.length, matches }, null, 2));
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
