const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri || uri === "memory") {
    console.log("[Database] Starting embedded in-memory MongoDB...");
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    console.log(`[Database] In-memory MongoDB running at: ${uri}`);
  }

  await mongoose.connect(uri);
  console.log("[Database] Connected successfully to MongoDB");
  return uri;
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      console.log("[Database] In-memory MongoDB stopped");
    }
  } catch (error) {
    console.error("[Database] Error disconnecting:", error);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
