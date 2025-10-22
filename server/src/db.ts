import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in server/.env");
}

// Optional: print what host we’re hitting (debug)
try {
  const u = new URL(process.env.DATABASE_URL);
  console.log("DB host:", u.hostname, "port:", u.port);
} catch {
  // Empty catch block
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    // Supabase requires SSL (pooler too)
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false, // Disable logging to reduce noise
  pool: {
    max: 5, // maximum number of connections in pool
    min: 0, // minimum number of connections in pool
    acquire: 30000, // maximum time (ms) that pool will try to get connection before throwing error
    idle: 10000, // maximum time (ms) that a connection can be idle before being released
  },
  retry: {
    max: 3, // maximum amount of connection retries
    match: [ // retry on these errors
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
    ],
  },
});

export const assertDatabaseConnection = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connecting to database (Attempt ${attempt}/${maxRetries})...`);
      await sequelize.authenticate();
      console.log("✅ Database connection established successfully");
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, {
        error: error.name,
        message: error.message,
        timestamp: new Date().toISOString(),
        details: {
          dialect: sequelize.getDialect(),
          host: new URL(process.env.DATABASE_URL).hostname,
          port: new URL(process.env.DATABASE_URL).port,
          database: new URL(process.env.DATABASE_URL).pathname.slice(1)
        }
      });
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts. Last error: ${error.message}`);
      }

      console.log(`Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

export const databaseDisabled = false;
