import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL, headers, owner, signUp } from "./helpers";

const NO_PAY = "belum diizinkan menerima pembayaran";

test("a Kasir without the payment permission gets no pay actions", async ({
  page,
}) => {
  const boss = await owner();
  const send = async (path: string, data?: object) => {
    const response = await boss.post(`${API_URL}${path}`, { headers, data });
    expect(response.ok()).toBe(true);
    return (await response.json()).data;
  };
  const tag = randomUUID().slice(0, 6);
  const category = await send("/api/menu-categories", { name: `Kat ${tag}` });
  const menu = await send("/api/menus", {
    categoryId: category.id,
    name: `Menu ${tag}`,
    price: 15000,
    imageUrl: "🍳",
  });
  // A walk-in order starts at Diproses; two steps take it to "Diantar ·
  // belum bayar", where the board's next action is taking payment.
  const order = await send("/api/orders", {
    items: [{ menuId: menu.id, qty: 1 }],
  });
  await send(`/api/orders/${order.id}/advance`);
  await send(`/api/orders/${order.id}/advance`);

  const matrix = (
    await (await boss.get(`${API_URL}/api/staff/permissions`)).json()
  ).data.CASHIER;
  const setPayment = async (payment: boolean) =>
    expect(
      (
        await boss.patch(`${API_URL}/api/staff/permissions`, {
          headers,
          data: { ...matrix, payment },
        })
      ).ok(),
    ).toBe(true);

  await setPayment(false);
  try {
    await signUp(page.request, "Kasir Tanpa Bayar", "cashier");
    await page.goto("/kasir");
    const card = page.locator(`.k-card[data-code="${order.code}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /pembayaran/ })).toHaveCount(
      0,
    );

    await card.getByRole("button", { name: /Detail pesanan/ }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toContainText(NO_PAY);
    await expect(
      drawer.getByRole("button", { name: /Terima pembayaran|Lihat struk/ }),
    ).toHaveCount(0);

    // The payment screen sends them back to the board with the reason.
    await page.goto(`/kasir/bayar?code=${order.code}`);
    await expect(page).toHaveURL(/\/kasir(\?.*)?$/);
    await expect(page.getByText(NO_PAY).first()).toBeVisible();
  } finally {
    await setPayment(matrix.payment);
  }
});
