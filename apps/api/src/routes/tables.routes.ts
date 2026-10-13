import { Router } from "express";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import {
  createTableSchema,
  updateTableSchema,
} from "@starter/shared/validators/fnb/tables";
import { requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireStaff } from "../middleware/staff";
import {
  createTable,
  deleteTable,
  listTables,
  regenerateQrCode,
  updateTable,
} from "../services/tables.service";

export const tablesRouter = Router();
tablesRouter.use(requireAuth, requireTrustedOrigin);

const manage = requireStaff("tables");

// Cashiers pick a table for manual orders.
tablesRouter.get("/", requireStaff(), async (_req, res) => {
  res.json({ data: await listTables() });
});

tablesRouter.post("/", manage, jsonBody, async (req, res) => {
  const table = await createTable(createTableSchema.parse(req.body));
  res.status(201).location(`/api/tables/${table.id}`).json({ data: table });
});

tablesRouter.patch("/:id", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = updateTableSchema.parse(req.body);
  res.json({ data: await updateTable(id, input) });
});

tablesRouter.post("/:id/regenerate-qr", manage, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  res.json({ data: await regenerateQrCode(id) });
});

tablesRouter.delete("/:id", manage, async (req, res) => {
  await deleteTable(recordIdSchema.parse(req.params.id));
  res.status(204).end();
});
