import mongoose from "mongoose";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startKeepAlive } from "./utils/keepAlive.js";
import { ensureUids } from "./utils/ensureUids.js";
import { ensureEmailVerification } from "./utils/ensureEmailVerification.js";
import { setupAi } from "./services/aiSetup.js";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

const start = async () => {
  await connectDB();
  await ensureUids();
  await ensureEmailVerification();
  await setupAi();

  const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });

  const stopKeepAlive = startKeepAlive();
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    stopKeepAlive();

    const forceExit = setTimeout(() => process.exit(1), 10000);
    forceExit.unref();

    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
