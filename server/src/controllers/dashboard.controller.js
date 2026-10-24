import { asyncHandler } from "../utils/asyncHandler.js";
import {
  buildAdminDashboard,
  buildHrDashboard,
  buildMyDashboard,
} from "../services/dashboardService.js";

export const getAdminDashboard = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await buildAdminDashboard(req.query),
  });
});

export const getHrDashboard = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await buildHrDashboard(req.query),
  });
});

export const getMyDashboard = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await buildMyDashboard(req.user),
  });
});
