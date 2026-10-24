import { asyncHandler } from "../utils/asyncHandler.js";
import { createSession, setRefreshCookie } from "../utils/tokens.js";
import { employeeSummaryForUser } from "../services/employeeService.js";
import { completeSetup, setupIsComplete } from "../services/setupService.js";

export const getSetupStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { setupComplete: await setupIsComplete() },
  });
});

export const postSetup = asyncHandler(async (req, res) => {
  const { user, settings } = await completeSetup(req.body);

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user,
      employee: await employeeSummaryForUser(user),
      mustChangePassword: user.mustChangePassword,
      accessToken,
      settings,
    },
    message: "Setup complete",
  });
});
