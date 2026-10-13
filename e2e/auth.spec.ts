import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, headers, PASSWORD } from "./helpers";

test("anonymous visitors cannot access the protected app", async ({
  page,
  request,
}) => {
  await page.goto("/kasir");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke akun" }),
  ).toBeVisible();
  // The root has no page: anonymous visitors land on sign-in.
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  const session = await request.get(`${API_URL}/api/auth/get-session`);
  expect(await session.json()).toBeNull();
});

test("signup, persisted session, signout, rejected password, and signin work across origins", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `builder-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Nama", { exact: true }).fill("Ada Builder");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  await expect(
    page.getByRole("button", { name: "Keluar", exact: true }),
  ).toBeVisible();
  // A full reload is rendered by the web server, which reads the session
  // from the API with the browser's cookie.
  await page.reload();
  await expect(page).toHaveURL(/\/kasir$/);
  await expect(
    page.getByRole("button", { name: "Keluar", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/kasir$/);
  const cookies = await context.cookies(API_URL);
  expect(
    cookies.some(
      (cookie) => cookie.name.includes("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/kasir$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/kasir");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("incorrect-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Email atau kata sandi salah" }),
  ).toContainText("Periksa lagi");
  await page.getByLabel("Kata sandi", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  expect(errors).toEqual([]);
});

test("auth rejects untrusted origins and invalid signup data", async ({
  request,
}) => {
  const crossOrigin = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: "https://untrusted.example" },
    data: {
      name: "Test",
      email: "cross-origin@example.com",
      password: "Test-password-123",
    },
  });
  expect(crossOrigin.status()).toBe(403);
  const invalid = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    headers,
    data: { name: "Test", email: "not-an-email", password: "short" },
  });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test("auth pages fit a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Masuk ke akun" }),
  ).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
  await page.getByRole("link", { name: /Buat akun pemilik/ }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});
