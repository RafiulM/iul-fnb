import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { env } from "../config/env";
import { cafeDate } from "../lib/fnb";
import { resetRateLimits } from "../lib/rate-limit";
import { agent, originHeader, setRole, signUp } from "./helpers";

const app = createApp();
const QR_ORIGIN = new URL(env.QR_MENU_URL).origin;

// Every name in the catalog is unique, and the database is shared by the
// whole run, so each test builds its own small menu.
const tag = () => randomUUID().slice(0, 8);

async function staff(role: "owner" | "cashier" | null, name = "Staf Uji") {
  const client = agent(app);
  const email = await signUp(client, name);
  await setRole(email, role);
  return Object.assign(client, { email });
}

type Client = Awaited<ReturnType<typeof staff>>;

async function post(client: Client, url: string, body?: object) {
  const req = client.post(url).set(originHeader);
  return body ? req.send(body) : req;
}

/** A category, one ingredient, one menu using it, and an active table. */
async function catalog(owner: Client, stockQty = 100, qtyUsed = 30) {
  const t = tag();
  const category = (
    await post(owner, "/api/menu-categories", { name: `Kat ${t}` })
  ).body.data;
  const ingredient = (
    await post(owner, "/api/ingredients", {
      name: `Bahan ${t}`,
      unit: "gram",
      stockQty,
      minStock: 10,
    })
  ).body.data;
  const menu = (
    await post(owner, "/api/menus", {
      categoryId: category.id,
      name: `Menu ${t}`,
      price: 10000,
      imageUrl: "🍳",
    })
  ).body.data;
  const recipe = await owner
    .put(`/api/menus/${menu.id}/recipe`)
    .set(originHeader)
    .send({ items: [{ ingredientId: ingredient.id, qtyUsed }] });
  expect(recipe.status).toBe(200);
  const table = (
    await post(owner, "/api/tables", {
      tableNumber: t.slice(0, 5).toUpperCase().replace(/^0+$/, "T"),
      area: "Teras",
    })
  ).body.data;
  return { category, ingredient, menu, table };
}

async function stockOf(client: Client, ingredientId: string) {
  const list = (await client.get("/api/ingredients")).body.data as {
    id: string;
    stockQty: number;
  }[];
  return list.find((i) => i.id === ingredientId)!.stockQty;
}

async function menuOf(client: Client, menuId: string) {
  const list = (await client.get("/api/menus")).body.data as {
    id: string;
    isAvailable: boolean;
  }[];
  return list.find((m) => m.id === menuId)!;
}

beforeEach(() => resetRateLimits());

describe("FnB access control", () => {
  it("answers 401 without a session and 403 for non-staff accounts", async () => {
    const anonymous = agent(app);
    for (const url of [
      "/api/orders",
      "/api/menus",
      "/api/ingredients",
      "/api/staff",
      "/api/settings",
      "/api/reports/sales?from=2026-01-01&to=2026-01-01",
    ]) {
      expect((await anonymous.get(url)).status).toBe(401);
    }

    // A self-registered account has the default role: no cafe access.
    const visitor = await staff(null);
    expect((await visitor.get("/api/orders")).status).toBe(403);
    expect((await visitor.get("/api/menus")).status).toBe(403);
  });

  it("lets cashiers run the board but keeps owner screens closed", async () => {
    const cashier = await staff("cashier");
    expect((await cashier.get("/api/orders")).status).toBe(200);
    expect((await cashier.get("/api/menus")).status).toBe(200);
    expect((await cashier.get("/api/ingredients")).status).toBe(200);
    expect((await cashier.get("/api/settings")).status).toBe(200);
    expect((await cashier.get("/api/staff")).status).toBe(403);
    expect(
      (
        await cashier.get(
          `/api/reports/sales?from=${cafeDate()}&to=${cafeDate()}`,
        )
      ).status,
    ).toBe(403);
    expect(
      (await post(cashier, "/api/menu-categories", { name: `X ${tag()}` }))
        .status,
    ).toBe(403);
    expect(
      (
        await cashier
          .patch("/api/settings")
          .set(originHeader)
          .send({ taxPercent: 0 })
      ).status,
    ).toBe(403);
  });

  it("refuses staff mutations from an untrusted origin", async () => {
    const owner = await staff("owner");
    const response = await owner
      .post("/api/menu-categories")
      .set({ Origin: "https://evil.example" })
      .send({ name: "Nope" });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN_ORIGIN");
  });
});

describe("QR order to cashier board", () => {
  it("runs the whole flow: order, process, pay, finish, deduct stock", async () => {
    const owner = await staff("owner", "Pemilik Uji");
    const cashier = await staff("cashier", "Kasir Uji");
    const { menu, ingredient, table } = await catalog(owner);
    const customer = agent(app);

    // The customer's menu and table lookup need no account.
    const publicMenu = await customer.get("/api/public/menu");
    expect(publicMenu.status).toBe(200);
    expect(
      publicMenu.body.data.menus.map((m: { id: string }) => m.id),
    ).toContain(menu.id);
    expect(
      (await customer.get(`/api/public/tables/${table.qrCode}`)).body.data,
    ).toEqual({ tableNumber: table.tableNumber, area: "Teras" });
    // Printed codes currently carry the table number.
    expect(
      (await customer.get(`/api/public/tables/${table.tableNumber}`)).status,
    ).toBe(200);

    // Prices come from the server, never the client.
    const tampered = await customer
      .post("/api/public/orders")
      .set({ Origin: QR_ORIGIN })
      .send({
        qrCode: table.qrCode,
        items: [{ menuId: menu.id, qty: 2, note: "", price: 1 }],
      });
    expect(tampered.status).toBe(422);

    const placed = await customer
      .post("/api/public/orders")
      .set({ Origin: QR_ORIGIN })
      .send({
        qrCode: table.qrCode,
        items: [{ menuId: menu.id, qty: 2, note: "  tanpa gula " }],
      });
    expect(placed.status).toBe(201);
    expect(placed.headers["access-control-allow-origin"]).toBe(QR_ORIGIN);
    expect(placed.headers["access-control-allow-credentials"]).toBeUndefined();
    const order = placed.body.data;
    expect(order).toMatchObject({
      status: "MENUNGGU",
      tableNumber: table.tableNumber,
      subtotal: 20000,
      tax: 2000,
      totalAmount: 22000,
      paymentStatus: "BELUM",
    });
    expect(order.code).toMatch(/^A-\d{3,}$/);
    expect(order.items[0]).toMatchObject({ qty: 2, note: "tanpa gula" });
    expect(order).not.toHaveProperty("cashierName");
    expect(placed.headers.location).toBe(`/api/public/orders/${order.id}`);

    // It shows up on the cashier's board for today.
    const board = (await cashier.get("/api/orders?date=today")).body.data;
    expect(board.map((o: { id: string }) => o.id)).toContain(order.id);

    // Advance by today's code: MENUNGGU → DIPROSES → SIAP → DIANTAR.
    for (const status of ["DIPROSES", "SIAP", "DIANTAR"]) {
      const step = await post(cashier, `/api/orders/${order.code}/advance`);
      expect(step.status).toBe(200);
      expect(step.body.data.status).toBe(status);
    }
    const blocked = await post(cashier, `/api/orders/${order.id}/advance`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("PAYMENT_REQUIRED");
    // Nothing deducted before the sale is finished.
    expect(await stockOf(owner, ingredient.id)).toBe(100);

    const short = await post(cashier, `/api/orders/${order.id}/payment`, {
      method: "CASH",
      paidAmount: 20000,
    });
    expect(short.status).toBe(422);

    const paid = await post(cashier, `/api/orders/${order.id}/payment`, {
      method: "CASH",
      paidAmount: 50000,
    });
    expect(paid.status).toBe(200);
    expect(paid.body.data).toMatchObject({
      status: "SELESAI",
      paymentStatus: "LUNAS",
      paymentMethod: "CASH",
      paidAmount: 50000,
      cashierName: "Kasir Uji",
    });
    expect(paid.body.data.completedAt).not.toBeNull();

    // Stock went down once: 2 portions × 30 g.
    expect(await stockOf(owner, ingredient.id)).toBe(40);
    const twice = await post(cashier, `/api/orders/${order.id}/payment`, {
      method: "CASH",
      paidAmount: 50000,
    });
    expect(twice.status).toBe(409);
    expect(await stockOf(owner, ingredient.id)).toBe(40);
    const movements = (
      await cashier.get(`/api/stock-movements?ingredientId=${ingredient.id}`)
    ).body.data;
    expect(movements[0]).toMatchObject({ type: "OUT", qty: -60 });
    expect(movements[0].note).toContain(order.code);

    // The customer sees the finished order with its timeline.
    const tracked = (await customer.get(`/api/public/orders/${order.id}`)).body
      .data;
    expect(tracked.status).toBe("SELESAI");
    expect(tracked.timeline.acceptedAt).not.toBeNull();
    expect(tracked.timeline.deliveredAt).not.toBeNull();

    // It now counts in today's sales report and transactions.
    const report = (
      await owner.get(`/api/reports/sales?from=${cafeDate()}&to=${cafeDate()}`)
    ).body.data;
    expect(report.summary.revenue).toBeGreaterThanOrEqual(22000);
    expect(report.series).toHaveLength(24);
    const history = (await cashier.get(`/api/transactions?q=${order.code}`))
      .body;
    expect(history.data.map((o: { id: string }) => o.id)).toContain(order.id);
  });

  it("marks a menu habis when stock runs out and back after restock", async () => {
    const owner = await staff("owner");
    const cashier = await staff("cashier");
    const { menu, ingredient, table } = await catalog(owner, 60, 30);

    // A walk-in order starts at DIPROSES with the cashier's name.
    const manual = await post(cashier, "/api/orders", {
      tableId: null,
      customerName: "Budi",
      items: [{ menuId: menu.id, qty: 2 }],
    });
    expect(manual.status).toBe(201);
    expect(manual.body.data).toMatchObject({
      orderType: "MANUAL",
      status: "DIPROSES",
      customerName: "Budi",
    });
    const id = manual.body.data.id;

    // Paying first keeps it on the board until it is delivered.
    const paid = await post(cashier, `/api/orders/${id}/payment`, {
      method: "NON_CASH",
      channel: "QRIS",
      paidAmount: 1,
    });
    expect(paid.body.data).toMatchObject({
      status: "DIPROSES",
      paymentStatus: "LUNAS",
      paidAmount: 22000,
      paymentChannel: "QRIS",
    });
    await post(cashier, `/api/orders/${id}/advance`);
    const delivered = await post(cashier, `/api/orders/${id}/advance`);
    expect(delivered.body.data.status).toBe("SELESAI");

    expect(await stockOf(owner, ingredient.id)).toBe(0);
    expect((await menuOf(owner, menu.id)).isAvailable).toBe(false);
    const refused = await agent(app)
      .post("/api/public/orders")
      .set({ Origin: QR_ORIGIN })
      .send({ qrCode: table.qrCode, items: [{ menuId: menu.id, qty: 1 }] });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("MENU_UNAVAILABLE");

    // Bahan masuk (cashiers may record it) brings the menu back.
    const restocked = await post(cashier, "/api/stock-movements/restock", {
      ingredientId: ingredient.id,
      qty: 90,
      note: "Pasar pagi",
    });
    expect(restocked.status).toBe(201);
    expect(restocked.body.data.stockQty).toBe(90);
    expect((await menuOf(owner, menu.id)).isAvailable).toBe(true);

    // Stock opname is the owner's.
    expect(
      (
        await post(cashier, "/api/stock-movements/adjust", {
          ingredientId: ingredient.id,
          countedQty: 80,
        })
      ).status,
    ).toBe(403);
    const adjusted = await post(owner, "/api/stock-movements/adjust", {
      ingredientId: ingredient.id,
      countedQty: 80,
    });
    expect(adjusted.body.data.stockQty).toBe(80);
  });

  it("cancels only unpaid new or in-progress orders, with a reason", async () => {
    const owner = await staff("owner");
    const cashier = await staff("cashier");
    const { menu, table } = await catalog(owner);
    const place = async () =>
      (
        await agent(app)
          .post("/api/public/orders")
          .set({ Origin: QR_ORIGIN })
          .send({ qrCode: table.qrCode, items: [{ menuId: menu.id, qty: 1 }] })
      ).body.data;

    const first = await place();
    expect(
      (await post(cashier, `/api/orders/${first.id}/cancel`, { reason: "" }))
        .status,
    ).toBe(422);
    const cancelled = await post(cashier, `/api/orders/${first.id}/cancel`, {
      reason: "Pelanggan batal",
    });
    expect(cancelled.body.data).toMatchObject({
      status: "DIBATALKAN",
      cancelReason: "Pelanggan batal",
    });
    expect(
      (await post(cashier, `/api/orders/${first.id}/advance`)).status,
    ).toBe(409);

    const second = await place();
    await post(cashier, `/api/orders/${second.id}/payment`, {
      method: "CASH",
      paidAmount: 100000,
    });
    const refused = await post(cashier, `/api/orders/${second.id}/cancel`, {
      reason: "Salah input",
    });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("ORDER_PAID");
  });

  it("rejects unknown or inactive tables and limits waiting orders", async () => {
    const owner = await staff("owner");
    const { menu, table } = await catalog(owner);
    const customer = agent(app);
    const order = (qrCode: string) =>
      customer
        .post("/api/public/orders")
        .set({ Origin: QR_ORIGIN })
        .send({ qrCode, items: [{ menuId: menu.id, qty: 1 }] });

    expect((await order("ks-unknown")).status).toBe(404);
    for (let i = 0; i < 5; i++)
      expect((await order(table.qrCode)).status).toBe(201);
    const sixth = await order(table.qrCode);
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("TOO_MANY_PENDING_ORDERS");

    await owner
      .patch(`/api/tables/${table.id}`)
      .set(originHeader)
      .send({ isActive: false });
    expect(
      (await customer.get(`/api/public/tables/${table.qrCode}`)).status,
    ).toBe(404);

    // A regenerated QR replaces the old token at once.
    await owner
      .patch(`/api/tables/${table.id}`)
      .set(originHeader)
      .send({ isActive: true });
    const fresh = (await post(owner, `/api/tables/${table.id}/regenerate-qr`))
      .body.data;
    expect(fresh.qrCode).not.toBe(table.qrCode);
    expect(
      (await customer.get(`/api/public/tables/${table.qrCode}`)).status,
    ).toBe(404);
  });
});

describe("Menu management", () => {
  it("validates names, prices, and empty-category deletes", async () => {
    const owner = await staff("owner");
    const { category, menu } = await catalog(owner);
    const duplicate = await post(owner, "/api/menus", {
      categoryId: category.id,
      name: menu.name.toUpperCase(),
      price: 5000,
    });
    expect(duplicate.status).toBe(409);
    expect(
      (
        await post(owner, "/api/menus", {
          categoryId: category.id,
          name: `Gratis ${tag()}`,
          price: 0,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await owner
          .delete(`/api/menu-categories/${category.id}`)
          .set(originHeader)
      ).status,
    ).toBe(409);

    const off = await owner
      .patch(`/api/menus/${menu.id}`)
      .set(originHeader)
      .send({ isAvailable: false });
    expect(off.body.data.isAvailable).toBe(false);

    expect(
      (await owner.delete(`/api/menus/${menu.id}`).set(originHeader)).status,
    ).toBe(204);
    expect(
      (
        await owner
          .delete(`/api/menu-categories/${category.id}`)
          .set(originHeader)
      ).status,
    ).toBe(204);
  });
});

describe("Staff accounts", () => {
  it("creates, deactivates, and protects owner accounts", async () => {
    const owner = await staff("owner");
    const email = `kasir-${tag()}@example.com`;
    const created = await post(owner, "/api/staff", {
      name: "Rina Kartika",
      email,
      role: "CASHIER",
      password: "Kasir-password-1",
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      email,
      role: "CASHIER",
      isActive: true,
      lastLoginAt: null,
    });
    expect(
      (
        await post(owner, "/api/staff", {
          name: "Dobel",
          email,
          role: "CASHIER",
          password: "Kasir-password-1",
        })
      ).status,
    ).toBe(409);

    // The new cashier signs in and works.
    const cashier = agent(app);
    const signIn = await cashier
      .post("/api/auth/sign-in/email")
      .set(originHeader)
      .send({ email, password: "Kasir-password-1" });
    expect(signIn.status).toBe(200);
    expect((await cashier.get("/api/orders")).status).toBe(200);
    const row = (await owner.get("/api/staff")).body.data.find(
      (s: { email: string }) => s.email === email,
    );
    expect(row).toMatchObject({ invited: false, isPrimaryOwner: false });
    expect(row.lastLoginAt).not.toBeNull();

    // Deactivating signs them out everywhere at once.
    const id = created.body.data.id;
    const off = await owner
      .patch(`/api/staff/${id}`)
      .set(originHeader)
      .send({ isActive: false });
    expect(off.body.data.isActive).toBe(false);
    expect((await cashier.get("/api/orders")).status).toBe(401);
    const again = await agent(app)
      .post("/api/auth/sign-in/email")
      .set(originHeader)
      .send({ email, password: "Kasir-password-1" });
    expect(again.status).not.toBe(200);

    // Owners cannot lock themselves out.
    const me = (await owner.get("/api/staff")).body.data.find(
      (s: { email: string }) => s.email === owner.email,
    );
    const self = await owner
      .patch(`/api/staff/${me.id}`)
      .set(originHeader)
      .send({ role: "CASHIER" });
    expect(self.status).toBe(409);
  });

  it("invites without a password until the owner sets one", async () => {
    const owner = await staff("owner");
    const email = `undangan-${tag()}@example.com`;
    const invited = await post(owner, "/api/staff", {
      name: "Dewi Lestari",
      email,
      role: "CASHIER",
    });
    expect(invited.status).toBe(201);
    expect(invited.body.data).toMatchObject({ invited: true, isActive: true });
    const id = invited.body.data.id;

    const edited = await owner
      .patch(`/api/staff/${id}`)
      .set(originHeader)
      .send({ email: email.replace("undangan", "dewi") });
    expect(edited.body.data.email).toBe(email.replace("undangan", "dewi"));

    expect(
      (
        await post(owner, `/api/staff/${id}/password`, {
          password: "Dewi-password-1",
        })
      ).status,
    ).toBe(204);
    const list = (await owner.get("/api/staff")).body.data;
    expect(list.find((s: { id: string }) => s.id === id).invited).toBe(false);
    const signIn = await agent(app)
      .post("/api/auth/sign-in/email")
      .set(originHeader)
      .send({
        email: email.replace("undangan", "dewi"),
        password: "Dewi-password-1",
      });
    expect(signIn.status).toBe(200);
  });

  it("applies the owner's Kasir permission matrix immediately", async () => {
    const owner = await staff("owner");
    const cashier = await staff("cashier");
    const matrix = (await cashier.get("/api/staff/permissions")).body.data;
    expect(matrix.OWNER.report).toBe(true);
    expect(matrix.CASHIER).toMatchObject({ pos: true, report: false });

    // A Kasir cannot widen their own access.
    expect(
      (
        await cashier
          .patch("/api/staff/permissions")
          .set(originHeader)
          .send({ ...matrix.CASHIER, report: true })
      ).status,
    ).toBe(403);

    const granted = await owner
      .patch("/api/staff/permissions")
      .set(originHeader)
      .send({ ...matrix.CASHIER, report: true, pos: false });
    // Unchecking "pos" also clears "payment", which depends on it.
    expect(granted.body.data.CASHIER).toMatchObject({
      report: true,
      pos: false,
      payment: false,
    });
    const today = cafeDate();
    expect(
      (await cashier.get(`/api/reports/sales?from=${today}&to=${today}`))
        .status,
    ).toBe(200);
    expect((await cashier.get("/api/orders")).status).toBe(403);

    await owner
      .patch("/api/staff/permissions")
      .set(originHeader)
      .send(matrix.CASHIER);
    expect((await cashier.get("/api/orders")).status).toBe(200);
  });
});

describe("Settings", () => {
  it("lets the owner change tax, which new orders then use", async () => {
    const owner = await staff("owner");
    const updated = await owner
      .patch("/api/settings")
      .set(originHeader)
      .send({ taxPercent: 11, instagram: "@kedai.senja" });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      taxPercent: 11,
      instagram: "kedai.senja",
    });
    const cafe = (await agent(app).get("/api/public/cafe")).body.data;
    expect(cafe.taxPercent).toBe(11);
    expect(cafe).not.toHaveProperty("receipt");

    expect(
      (
        await owner
          .patch("/api/settings")
          .set(originHeader)
          .send({ taxPercent: 150 })
      ).status,
    ).toBe(422);
    await owner
      .patch("/api/settings")
      .set(originHeader)
      .send({ taxPercent: 10 });
  });

  it("stores a small inline logo but refuses other data URLs", async () => {
    const owner = await staff("owner");
    const logo = "data:image/webp;base64,UklGRhQAAABXRUJQ";
    const saved = await owner
      .patch("/api/settings")
      .set(originHeader)
      .send({ logoUrl: logo });
    expect(saved.status).toBe(200);
    expect((await agent(app).get("/api/public/cafe")).body.data.logoUrl).toBe(
      logo,
    );

    for (const logoUrl of [
      "data:image/svg+xml;base64,PHN2Zz4=",
      `data:image/png;base64,${"A".repeat(60_000)}`,
      "http://example.com/logo.png",
    ])
      expect(
        (await owner.patch("/api/settings").set(originHeader).send({ logoUrl }))
          .status,
      ).toBe(422);
    await owner
      .patch("/api/settings")
      .set(originHeader)
      .send({ logoUrl: null });
  });
});

describe("First account", () => {
  it("makes the very first sign-up the owner, and only that one", async () => {
    // Disposable test database: start from no accounts at all.
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    try {
      await pool.query('DELETE FROM "user"');
    } finally {
      await pool.end();
    }
    const first = agent(app);
    await signUp(first, "Pemilik Pertama");
    expect((await first.get("/api/staff")).status).toBe(200);
    const list = (await first.get("/api/staff")).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ role: "OWNER", isPrimaryOwner: true });

    const second = agent(app);
    await signUp(second, "Pengunjung");
    expect((await second.get("/api/orders")).status).toBe(403);
  });
});
