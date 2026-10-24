import { connectDB, disconnectDB } from "../config/db.js";
import { bootstrapAdminFromEnv } from "../services/setupService.js";

const run = async () => {
  try {
    await connectDB();
    await bootstrapAdminFromEnv();
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();
