import { Router } from "express";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import {
  cancelOrderSchema,
  createManualOrderSchema,
  listOrdersSchema,
  listTransactionsSchema,
  payOrderSchema,
} from "@starter/shared/validators/fnb/orders";
import { requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireStaff } from "../middleware/staff";
import { cafeDate } from "../lib/fnb";
import {
  advanceOrder,
  cancelOrder,
  createManualOrder,
  getOrder,
  listOrdersOfDay,
  listTransactions,
  payOrder,
} from "../services/orders.service";
import { actorOf } from "./_staff";

// The cashier board. `:ref` is an order id or today's code ("A-027").
export const ordersRouter = Router();

ordersRouter.use(requireAuth, requireTrustedOrigin);

const pos = requireStaff("pos");

ordersRouter.get("/", pos, async (req, res) => {
  const { date } = listOrdersSchema.parse(req.query);
  res.json({
    data: await listOrdersOfDay(date === "today" ? cafeDate() : date),
  });
});

ordersRouter.post("/", pos, jsonBody, async (req, res) => {
  const input = createManualOrderSchema.parse(req.body);
  const order = await createManualOrder(input, actorOf(req));
  res.status(201).location(`/api/orders/${order.id}`).json({ data: order });
});

ordersRouter.get("/:ref", pos, async (req, res) => {
  const ref = recordIdSchema.parse(req.params.ref);
  res.json({ data: await getOrder(ref) });
});

ordersRouter.post("/:ref/advance", pos, async (req, res) => {
  const ref = recordIdSchema.parse(req.params.ref);
  res.json({ data: await advanceOrder(ref, actorOf(req)) });
});

ordersRouter.post(
  "/:ref/payment",
  requireStaff("payment"),
  jsonBody,
  async (req, res) => {
    const ref = recordIdSchema.parse(req.params.ref);
    const input = payOrderSchema.parse(req.body);
    res.json({ data: await payOrder(ref, input, actorOf(req)) });
  },
);

ordersRouter.post("/:ref/cancel", pos, jsonBody, async (req, res) => {
  const ref = recordIdSchema.parse(req.params.ref);
  const { reason } = cancelOrderSchema.parse(req.body);
  res.json({ data: await cancelOrder(ref, reason, actorOf(req)) });
});

// Finished and cancelled orders (riwayat), filterable and paginated.
export const transactionsRouter = Router();

transactionsRouter.use(requireAuth, requireTrustedOrigin);

transactionsRouter.get("/", pos, async (req, res) => {
  const input = listTransactionsSchema.parse(req.query);
  res.json(await listTransactions(input));
});
