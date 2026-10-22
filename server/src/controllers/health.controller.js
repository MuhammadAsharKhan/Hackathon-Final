import mongoose from "mongoose";

export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
};
