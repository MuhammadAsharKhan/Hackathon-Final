import mongoose from "mongoose";
import { config } from "./env.js";

export const connectDB = async () => {
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};
