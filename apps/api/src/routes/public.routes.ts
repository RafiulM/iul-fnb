import { Router } from "express";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import { createQrOrderSchema } from "@starter/shared/validators/fnb/orders";
import { jsonBody } from "../middleware/body";
import { rateLimit } from "../lib/rate-limit";
import { listCategories, listMenus } from "../services/menu.service";
import {
  createQrOrder,
  getPublicOrder,
  popularMenuIds,
} from "../services/orders.service";
import { getPublicCafe } from "../services/settings.service";
import { getPublicTable } from "../services/tables.service";

// The customer QR Menu app: no account and no cookies. Everything here is
// readable by anyone holding the link, so it exposes only what a customer at
// the table may see. Order tracking needs the order's unguessable id.
export const publicRouter = Router();

// Generous enough for status polling, tight enough to blunt scraping.
publicRouter.use(rateLimit({ windowMs: 60_000, max: 300 }));

publicRouter.get("/cafe", async (_req, res) => {
  res.json({ data: await getPublicCafe() });
});

publicRouter.get("/menu", async (_req, res) => {
  const [categories, menus, popular] = await Promise.all([
    listCategories(),
    listMenus(),
    popularMenuIds(),
  ]);
  res.json({ data: { categories, menus, popularMenuIds: popular } });
});

publicRouter.get("/tables/:code", async (req, res) => {
  const code = recordIdSchema.parse(req.params.code);
  res.json({ data: await getPublicTable(code) });
});

publicRouter.post(
  "/orders",
  rateLimit({
    windowMs: 10 * 60_000,
    max: 20,
    message: "Terlalu banyak pesanan dari perangkat ini. Panggil kasir.",
  }),
  jsonBody,
  async (req, res) => {
    const input = createQrOrderSchema.parse(req.body);
    const order = await createQrOrder(input);
    res
      .status(201)
      .location(`/api/public/orders/${order.id}`)
      .json({ data: order });
  },
);

publicRouter.get("/orders/:id", async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  res.json({ data: await getPublicOrder(id) });
});
