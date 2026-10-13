import { Router } from "express";
import { salesReportSchema } from "@starter/shared/validators/fnb/reports";
import { requireAuth } from "../middleware/auth";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireStaff } from "../middleware/staff";
import { salesReport } from "../services/reports.service";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireTrustedOrigin, requireStaff("report"));

reportsRouter.get("/sales", async (req, res) => {
  res.json({ data: await salesReport(salesReportSchema.parse(req.query)) });
});
