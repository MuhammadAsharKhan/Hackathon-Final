import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { config } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import healthRoutes from "./routes/health.routes.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

const isAllowedOrigin = (origin) =>
  !origin || config.allowedOrigins.includes(origin);

// The hops between the client and this process decide which address the rate
// limiters see. One hop fits Railway, two fit a Vercel rewrite in front of it.
app.set("trust proxy", config.trustProxyHops);

app.use(helmet());
app.use(compression());

// CORS headers only tell the browser which origins may read a response. They
// must not decide whether the request runs: the app calls the API through the
// host's /api rewrite, so the browser still sends the app's origin and a
// deployment domain missing from CLIENT_URL would otherwise fail every call.
// Requests authenticate with a Bearer token or the httpOnly refresh cookie,
// which SameSite keeps off cross-site requests either way.
app.use(
  cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

if (!config.isProduction) {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({ success: true, data: { name: "api" } });
});

app.use("/api", healthRoutes);
app.use("/api", globalLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
