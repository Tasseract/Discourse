import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function setupIndexes() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const dbName = process.env.MONGODB_DB || 'better-auth';
    const db = client.db(dbName);

    // Create indexes for posts collection
    const postsCollection = db.collection('posts');
    await postsCollection.createIndex({ submittedAt: -1 });
    await postsCollection.createIndex({ points: -1 });
    await postsCollection.createIndex({ channelId: 1 });
    await postsCollection.createIndex({ submittedById: 1 });
    console.log('✓ Created indexes for posts collection');

    // Create indexes for users collection
    const usersCollection = db.collection('user');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✓ Created indexes for user collection');

    // Create indexes for sessions collection
    const sessionsCollection = db.collection('session');
    await sessionsCollection.createIndex({ expiresAt: 1 });
    await sessionsCollection.createIndex({ userId: 1 });
    console.log('✓ Created indexes for session collection');

    // Create indexes for channels collection
    const channelsCollection = db.collection('channels');
    await channelsCollection.createIndex({ slug: 1 }, { unique: true, sparse: true });
    await channelsCollection.createIndex({ name: 1 });
    console.log('✓ Created indexes for channels collection');

    // Create indexes for comments collection
    const commentsCollection = db.collection('comments');
    await commentsCollection.createIndex({ postId: 1 });
    await commentsCollection.createIndex({ authorId: 1 });
    await commentsCollection.createIndex({ createdAt: -1 });
    console.log('✓ Created indexes for comments collection');

    console.log('\n✅ All indexes created successfully!');
  } catch (error) {
    console.error('Error setting up indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupIndexes();
