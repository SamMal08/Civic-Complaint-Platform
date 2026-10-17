const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const CONTRACTS_DIR = path.join(__dirname, "../../contracts");
const BACKEND_DIR = path.join(__dirname, "..");

let hardhatProcess = null;
let backendProcess = null;

function isRpcReachable(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1
      });

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
          },
          timeout: 1500
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve(res.statusCode === 200);
          });
        }
      );

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.write(postData);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function waitForRpc(rpcUrl, timeoutMs = 30000) {
  const startTime = Date.now();
  process.stdout.write("[Orchestrator] Waiting for Hardhat node to be ready");
  while (Date.now() - startTime < timeoutMs) {
    const ready = await isRpcReachable(rpcUrl);
    if (ready) {
      console.log(" -> READY!");
      return true;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("\n[Orchestrator] Timeout waiting for RPC node.");
  return false;
}

async function main() {
  console.log("\n========================================================");
  console.log("   DARPAN WEB3 & BLOCKCHAIN PLATFORM ORCHESTRATOR       ");
  console.log("========================================================");

  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

  // 1. Check if node is already running
  const alreadyRunning = await isRpcReachable(rpcUrl);
  if (alreadyRunning) {
    console.log(`[Orchestrator] Hardhat node already active at ${rpcUrl}`);
  } else {
    console.log(`[Orchestrator] Starting local Hardhat node (Chain ID: 31337)...`);
    hardhatProcess = spawn("npx.cmd", ["hardhat", "node", "--config", "hardhat.config.js"], {
      cwd: CONTRACTS_DIR,
      shell: true,
      stdio: "pipe"
    });

    hardhatProcess.stderr.on("data", (d) => {
      // suppress minor warnings
    });

    const isReady = await waitForRpc(rpcUrl, 30000);
    if (!isReady) {
      console.error("[Orchestrator] Failed to start Hardhat node. Please check contracts setup.");
      process.exit(1);
    }
  }

  // 2. Deploy smart contract to local network
  console.log("\n[Orchestrator] Deploying DarpanCivic smart contract...");
  try {
    execSync("npx hardhat run scripts/deploy.js --network localhost --config hardhat.config.js", {
      cwd: CONTRACTS_DIR,
      stdio: "inherit"
    });
    console.log("[Orchestrator] Contract deployed & ABI exported successfully.");
  } catch (err) {
    console.error("[Orchestrator] Contract deployment failed:", err.message);
    cleanup();
    process.exit(1);
  }

  // 3. Seed sample issues across all lifecycle statuses
  console.log("\n[Orchestrator] Seeding database with sample issues in every status...");
  try {
    execSync("node scripts/seed.js", {
      cwd: BACKEND_DIR,
      stdio: "inherit"
    });
    console.log("[Orchestrator] Data seeded successfully.");
  } catch (err) {
    console.error("[Orchestrator] Seeding encountered error:", err.message);
  }

  // 4. Start backend server
  console.log("\n[Orchestrator] Booting Darpan backend & Web3 event indexer...");
  backendProcess = spawn("node", ["src/server.js"], {
    cwd: BACKEND_DIR,
    shell: true,
    stdio: "inherit"
  });

  backendProcess.on("exit", (code) => {
    console.log(`[Orchestrator] Backend server exited with code ${code}`);
    cleanup();
    process.exit(code || 0);
  });
}

function cleanup() {
  if (hardhatProcess) {
    console.log("[Orchestrator] Stopping Hardhat node...");
    try {
      process.kill(-hardhatProcess.pid);
    } catch {
      hardhatProcess.kill();
    }
  }
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {}
  }
}

process.on("SIGINT", () => {
  console.log("\n[Orchestrator] Caught interrupt signal. Cleaning up...");
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

if (require.main === module) {
  main().catch((err) => {
    console.error("[Orchestrator] Fatal error:", err);
    cleanup();
    process.exit(1);
  });
}
