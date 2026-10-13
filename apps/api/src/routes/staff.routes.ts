import { Router, type Request } from "express";
import { staffRoleOf } from "@starter/shared/permissions";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import {
  createStaffSchema,
  resetStaffPasswordSchema,
  updateCashierPermissionsSchema,
  updateStaffSchema,
} from "@starter/shared/validators/fnb/staff";
import { getAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireOwner, requireStaff } from "../middleware/staff";
import {
  createStaff,
  listStaff,
  setStaffPassword,
  updateStaff,
} from "../services/staff.service";
import {
  getStaffPermissions,
  updateCashierPermissions,
} from "../services/settings.service";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireTrustedOrigin);

const actor = (req: Request) => {
  const { user } = getAuth(req);
  return { id: user.id, role: staffRoleOf(user.role)! };
};

// Every staff member may read the matrix (the web app hides controls with it).
staffRouter.get("/permissions", requireStaff(), async (_req, res) => {
  res.json({ data: await getStaffPermissions() });
});

// Only a Pemilik edits what a Kasir may do, so no Kasir can widen their own.
staffRouter.patch("/permissions", requireOwner, jsonBody, async (req, res) => {
  const matrix = updateCashierPermissionsSchema.parse(req.body);
  res.json({ data: await updateCashierPermissions(matrix) });
});

const manage = requireStaff("staff");

staffRouter.get("/", manage, async (_req, res) => {
  res.json({ data: await listStaff() });
});

staffRouter.post("/", manage, jsonBody, async (req, res) => {
  const input = createStaffSchema.parse(req.body);
  const staff = await createStaff(actor(req).role, input);
  res.status(201).location(`/api/staff/${staff.id}`).json({ data: staff });
});

staffRouter.patch("/:id", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = updateStaffSchema.parse(req.body);
  res.json({ data: await updateStaff(actor(req), id, input) });
});

staffRouter.post("/:id/password", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const { password } = resetStaffPasswordSchema.parse(req.body);
  await setStaffPassword(actor(req).role, id, password);
  res.status(204).end();
});
