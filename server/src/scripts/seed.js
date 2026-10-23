import { config } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";

const seed = async () => {
  if (!config.adminEmail || !config.adminPassword) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set, seed skipped");
    return;
  }

  const email = config.adminEmail.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === "admin" && existing.emailVerified) {
      console.log(`Admin already exists: ${email}`);
      return;
    }
    existing.role = "admin";
    existing.emailVerified = true;
    await existing.save();
    console.log(`Promoted to admin: ${email}`);
    return;
  }

  await User.create({
    name: "Admin",
    email,
    password: config.adminPassword,
    role: "admin",
    emailVerified: true,
  });
  console.log(`Admin created: ${email}`);
};

const run = async () => {
  try {
    await connectDB();
    await seed();
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();
