import { Router } from "express";
import { updateSettingsSchema } from "@starter/shared/validators/fnb/settings";
import { requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireStaff } from "../middleware/staff";
import { getSettings, updateSettings } from "../services/settings.service";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireTrustedOrigin);

// Cashiers need the receipt format and tax settings.
settingsRouter.get("/", requireStaff(), async (_req, res) => {
  res.json({ data: await getSettings() });
});

settingsRouter.patch(
  "/",
  requireStaff("settings"),
  jsonBody,
  async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    res.json({ data: await updateSettings(input) });
  },
);
