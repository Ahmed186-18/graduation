import type { Request, Response } from "express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import router from "./routes.js";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
const { assertDatabaseConnection, databaseDisabled, sequelize } = await import("./db.js");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:8082"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api", router);

// Healthcheck
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "solace-lens-api", env: process.env.NODE_ENV || "development" });
});

// Placeholder routes (keep as-is)
// app.post("/api/auth/login", (_req, res) => res.status(501).json({ message: "Not implemented" }));
// app.post("/api/register", (_req, res) => res.status(501).json({ message: "Not implemented" }));
// app.get("/api/cases", (_req, res) => res.status(501).json({ message: "Not implemented" }));

// Better crash logs (optional keepers)
process.on("uncaughtException", (err) => {
  try {
    console.error("uncaughtException:", (err as Error)?.stack ?? err);
    if (err && typeof err === "object") {
      console.error(
        "error properties:",
        Object.getOwnPropertyNames(err).reduce((acc: Record<string, unknown>, k) => ((acc[k] = (err as unknown as Record<string, unknown>)[k]), acc), {})
      );
    }
  } catch (e) {
    console.error("failed to log uncaughtException", e);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  try {
    console.error("unhandledRejection:", (reason as Error)?.stack ?? reason);
  } catch (e) {
    console.error("failed to log unhandledRejection", e);
  }
  process.exit(1);
});

async function findAvailablePort(startPort: number): Promise<number> {
  const net = await import('net');
  
  function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          server.close();
          resolve(true);
        })
        .listen(port);
    });
  }

  let port = startPort;
  while (port < startPort + 10) { // Try up to 10 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
}

const preferredPort = Number(process.env.PORT ?? 4000);

assertDatabaseConnection()
  .then(async () => {
    if (!databaseDisabled && process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true }).catch((error: Error) => console.error("Sync error", error));
    }
    
    try {
      const availablePort = await findAvailablePort(preferredPort);
      app.listen(availablePort, () => {
        console.log(`API listening on http://localhost:${availablePort}`);
        // Store the actual port for other parts of the application
        process.env.ACTUAL_PORT = String(availablePort);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })
  .catch((error: Error) => {
    console.error("Failed to connect to database", error);
    process.exit(1);
  });
