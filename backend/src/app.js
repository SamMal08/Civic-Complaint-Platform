const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { errorHandler, notFoundHandler } = require("./middlewares/error");
const { contractAddress, chainId, blockExplorerUrl } = require("./config/chain");

const authRoutes = require("./routes/authRoutes");
const issueRoutes = require("./routes/issueRoutes");
const officerRoutes = require("./routes/officerRoutes");
const privacyRoutes = require("./routes/privacyRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// System Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Darpan Web3 Civic Backend",
    timestamp: new Date().toISOString(),
    web3: {
      contractAddress,
      chainId,
      blockExplorerUrl
    }
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/officer", officerRoutes);
app.use("/api/users", privacyRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
