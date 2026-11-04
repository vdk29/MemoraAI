// UI contract tests use mocked transport; these do not establish live Auth/Realtime behavior.
import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001";
for (const width of [1440, 390])
  test(`workspace interactions ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let notes: any[] = [];
    await page.addInitScript(
      ({ uid }) => {
        localStorage.setItem(
          "sb-ewsqrqzabahjtmorrqhh-auth-token",
          JSON.stringify({
            access_token: "test-token",
            refresh_token: "test-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: {
              id: uid,
              email: "test@example.invalid",
              aud: "authenticated",
              role: "authenticated",
            },
          }),
        );
      },
      { uid },
    );
    await page.route(
      "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
      async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          table = url.pathname.split("/").pop();
        let data: any = [];
        if (table === "profiles")
          data = [
            {
              id: uid,
              display_name: "Тестовый пользователь",
              bio: "",
              created_at: new Date().toISOString(),
              discoverable: true,
            },
          ];
        if (table === "settings")
          data = [
            { user_id: uid, notify_messages: true, notify_friends: true },
          ];
        if (table === "notes") {
          if (req.method() === "POST") {
            notes.push({
              ...req.postDataJSON(),
              id: "n1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
          if (req.method() === "PATCH")
            notes = notes.map((n) => ({ ...n, ...req.postDataJSON() }));
          if (req.method() === "DELETE") notes = [];
          data = notes;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      },
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Ваши мысли/,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/dashboard-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.goto("/#notes");
    await page.getByRole("button", { name: "Новая заметка" }).click();
    await page
      .getByLabel("Название", { exact: true })
      .fill("Проверка редактора");
    await page
      .getByLabel("Текст", { exact: true })
      .fill("Текст сохраняется через общий модуль данных.");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Проверка редактора" }),
    ).toBeVisible();
    await page.locator('.note button[aria-label="Избранное"]').click();
    await expect(
      page.locator('.note button[aria-label="Избранное"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Проверка редактора/ }).click();
    await page
      .getByLabel("Название", { exact: true })
      .fill("Обновлённая заметка");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Обновлённая заметка" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Обновлённая заметка/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Удалить", exact: true }).click();
    await expect(page.locator(".note")).toHaveCount(0);
    await page.goto("/#chats");
    await expect(
      page.getByRole("heading", { name: "Люди и переписки" }),
    ).toBeVisible();
    await page.screenshot({ path: `docs/chats-${width}.png`, fullPage: true });
    await page.goto("/#settings");
    await expect(
      page.getByRole("heading", { name: "Настройки профиля" }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/settings-${width}.png`,
      fullPage: true,
    });
  });
