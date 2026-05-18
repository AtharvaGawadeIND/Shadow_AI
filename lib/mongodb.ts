import mongoose from "mongoose";

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var shadowMongo: MongoCache | undefined;
}

const cache: MongoCache = global.shadowMongo ?? { conn: null, promise: null };
global.shadowMongo = cache;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function usingMongo() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectMongo(retries = 2): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      dbName: "shadowshield",
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      bufferCommands: false
    });
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      cache.conn = await cache.promise;
      return cache.conn;
    } catch (error) {
      cache.promise = null;
      if (attempt === retries) throw error;
      await sleep(250 * (attempt + 1));
      cache.promise = mongoose.connect(uri, {
        dbName: "shadowshield",
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
        bufferCommands: false
      });
    }
  }

  return null;
}
