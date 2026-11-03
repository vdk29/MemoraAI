import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`auth layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "С возвращением" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Создать аккаунт", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Начните свою историю" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({ path: `docs/auth-${width}.png`, fullPage: true });
  });
test("private route requires session", async ({ page }) => {
  await page.goto("/#notes");
  await expect(
    page.getByRole("heading", { name: "С возвращением" }),
  ).toBeVisible();
  await expect(page.getByText("Мои заметки", { exact: true })).toHaveCount(0);
});
