import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: Promise<typeof mongoose> | undefined;
}

export async function connectMongo() {
  if (!process.env.MONGODB_URI) return null;
  if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(process.env.MONGODB_URI, {
      dbName: "shadowshield"
    });
  }
  return global.mongooseConnection;
}

export function usingMongo() {
  return Boolean(process.env.MONGODB_URI);
}
