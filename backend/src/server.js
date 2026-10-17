require("dotenv").config();
const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");
const { startIndexer } = require("./services/eventIndexer");

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    console.log("==================================================");
    console.log(" Starting Darpan Web3 Civic Backend");
    console.log("==================================================");

    // 1. Connect to MongoDB (in-memory or external)
    await connectDB();

    // 2. Start Express Server
    const server = app.listen(PORT, () => {
      console.log(`[HTTP Server] Listening on http://localhost:${PORT}`);
      console.log(`[Swagger Docs] Available at http://localhost:${PORT}/api/docs`);
      console.log(`[Health Check] Available at http://localhost:${PORT}/api/health`);
    });

    // 3. Start Blockchain Event Indexer
    await startIndexer();
    console.log("==================================================");

    // Graceful shutdown
    const shutdown = async () => {
      console.log("\n[Server] Shutting down gracefully...");
      server.close(async () => {
        await disconnectDB();
        console.log("[Server] Exited cleanly.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("[Bootstrap] Fatal startup error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = bootstrap;
