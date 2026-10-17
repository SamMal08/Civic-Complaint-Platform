const swaggerJsdoc = require("swagger-jsdoc");
const { contractAddress, chainId } = require("./chain");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Darpan - Web3 Civic Complaint Platform API",
      version: "1.0.0",
      description: `
**Darpan** is a decentralized, transparent civic complaint platform.
Citizens report civic issues with photo proof and geohashes, community members upvote/downvote,
officers act with transparent on-chain accountability, and citizens verify the final resolution.

- **Smart Contract Address:** \`${contractAddress}\`
- **Chain ID:** \`${chainId}\` (Local Hardhat Node / Polygon Amoy)
- **Source of Truth:** Blockchain state machine with real-time MongoDB indexing
      `,
      contact: {
        name: "Darpan Engineering Team"
      }
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from /api/auth/login or /api/auth/demo/:role"
        },
        WalletHeader: {
          type: "apiKey",
          in: "header",
          name: "X-Wallet-Address",
          description: "Developer direct wallet authentication header (e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8)"
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
