import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, MongoClientOptions } from "mongodb";

// Use a module-global singleton (via Node global) to avoid creating many
// MongoClient instances during HMR in development.
declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoConnectAttempted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mongoConnectFailed: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mongoLastError: any;
}

const uri = process.env.MONGODB_URI || "";
// Allow overriding the max pool size via env var for low-resource/dev setups
const DEFAULT_MAX_POOL = 4;
const envPool = parseInt(process.env.MONGODB_MAX_POOL_SIZE || "", 10);
const maxPool = Number.isFinite(envPool) && envPool > 0 ? envPool : DEFAULT_MAX_POOL;
const options: MongoClientOptions = {
  appName: "devrel.template.vercel-better-auth",
  // short timeouts to fail fast during development if the DB is unreachable
  maxIdleTimeMS: 10000,
  maxPoolSize: maxPool,
  // server selection timeout helps the client give up quickly when DNS fails
  serverSelectionTimeoutMS: 5000 as any,
};

// initialize client singleton if not present
if (!global.__mongoClient) {
  global.__mongoClient = new MongoClient(uri, options);
}

const client = global.__mongoClient as MongoClient;

// Attach Vercel helper if available (no-op elsewhere)
try {
  attachDatabasePool(client);
} catch (err) {
  // ignore if attachDatabasePool is not applicable
}

export { client };

export async function getDatabase(dbName?: string) {
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');
  if (global.__mongoConnectFailed) {
    throw new Error(`Database connection failed: ${global.__mongoLastError?.message || String(global.__mongoLastError)}`);
  }

  if (!global.__mongoConnectAttempted) {
    global.__mongoConnectAttempted = true;
    try {
      await client.connect();
    } catch (e) {
      global.__mongoConnectFailed = true;
      global.__mongoLastError = e;
      throw new Error(`Database connection failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return client.db(dbName || process.env.MONGODB_DB || "better-auth");
}
