import { expect, test } from "@playwright/test";

test("story loads with the live default headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Could everyone on Earth fit in one city?");
  await expect(page.getByLabel("8,893 square kilometres")).toBeVisible();
  await expect(page.getByText("Illustrative scenario, not a forecast").first()).toBeAttached();
});

test("preset changes update KPIs and survive reload and back", async ({ page }) => {
  await page.goto("/#lab");
  const strip = page.locator("#lab").getByText(/of land/).first();
  await expect(strip).toContainText("59.4%");

  await page.getByRole("radio", { name: /Lower Pasture Demand/ }).click();
  await expect(page).toHaveURL(/preset=lower-pasture/);
  await expect(strip).toContainText("49.4%");

  await page.reload();
  await expect(page.getByRole("radio", { name: /Lower Pasture Demand/ })).toHaveAttribute("aria-checked", "true");
  await expect(strip).toContainText("49.4%");

  await page.getByRole("radio", { name: /Forest Recovery/ }).click();
  await expect(page).toHaveURL(/preset=forest-recovery/);
  await page.goBack();
  await expect(page).toHaveURL(/preset=lower-pasture/);
  await expect(page.getByRole("radio", { name: /Lower Pasture Demand/ })).toHaveAttribute("aria-checked", "true");
});

test("oversubscribed scenario shows 'exceeds' warning instead of clipping", async ({ page }) => {
  await page.goto("/?v=1&cd=1.5&cy=0.7&pd=1.5&pp=0.7&ft=1.5#lab");
  await expect(page.locator("#land-budget").getByRole("alert")).toContainText("Exceeds terrestrial area");
  await expect(page.locator("#land-budget").getByRole("cell", { name: "Exceeds land available" })).toBeVisible();
});

test("A/B compare explains the difference", async ({ page }) => {
  await page.goto("/#lab");
  await page.getByRole("button", { name: "Pin as A" }).first().click();
  await page.getByRole("radio", { name: /Lower Pasture Demand/ }).click();
  const cmp = page.locator("#compare");
  await expect(cmp).toContainText("Why total land differs");
  await expect(cmp).toContainText("Pasture demand: 1× → 0.5×");
  await expect(page).toHaveURL(/cmp=/);
});

test("invalid URL values fall back safely", async ({ page }) => {
  await page.goto("/?v=1&fl=0&pph=abc#lab");
  // floors clamps to 1, people per home falls back to 3.5: page still renders numbers
  await expect(page.getByLabel("Floors per tower value")).toHaveValue("1");
  await expect(page.getByLabel("People per home value")).toHaveValue("3.5");
});
