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
import ApiError from "./utils/ApiError.js";

const app = express();

const isAllowedOrigin = (origin) =>
  !origin || config.allowedOrigins.includes(origin);

// The hops between the client and this process decide which address the rate
// limiters see. One hop fits Railway, two fit a Vercel rewrite in front of it.
app.set("trust proxy", config.trustProxyHops);

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new ApiError(403, "Origin not allowed"));
    },
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
