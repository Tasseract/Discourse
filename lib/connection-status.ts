import { client as dbClient } from "@/lib/mongodb";
import { debug, error } from '@/lib/logger';

export async function dbConnectionStatus() {
  if (!process.env.MONGODB_URI) {
    return "No MONGODB_URI environment variable";
  }
  if (!dbClient) {
    return "Database client not initialized";
  }
  try {
    const client = await dbClient.connect();
    const db = client.db();
    const result = await db.command({ ping: 1 });
    debug("MongoDB connection successful:", result);
    return "Database connected";
  } catch (err) {
    // avoid shadowing the imported `error` logger by using `err` for the
    // caught exception and pass it to the logger.
    error("Error connecting to the database:", err);
    return "Database not connected";
  }
}
