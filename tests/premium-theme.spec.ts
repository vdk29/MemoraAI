import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001";
test("system theme, explicit choice, reload persistence and cross-tab sync", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Системная тема" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Светлая тема" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Тёмная тема" }).click();
  await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Системная тема" }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await second.close();
});
for (const width of [1440, 390])
  for (const theme of ["light", "dark"] as const)
    test(`all surfaces ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await page.getByRole("heading", { name: "С возвращением" }).waitFor();
      await page.screenshot({
        path: `video-assets/after/premium-${theme}-auth-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(
        ({ uid, theme }) => {
          localStorage.setItem("memora-theme", theme);
          localStorage.setItem(
            "sb-ewsqrqzabahjtmorrqhh-auth-token",
            JSON.stringify({
              access_token: "test-token",
              refresh_token: "fixture",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              user: {
                id: uid,
                email: "fixture@example.invalid",
                aud: "authenticated",
                role: "authenticated",
              },
            }),
          );
        },
        { uid, theme },
      );
      const now = new Date(),
        key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      await page.route(
        "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
        async (route) => {
          const req = route.request(),
            table = new URL(req.url()).pathname.split("/").pop();
          let data: any = [];
          if (table === "profiles")
            data = [
              {
                id: uid,
                display_name: "Анна",
                bio: "Продуктовый дизайн, идеи и новые проекты.",
                created_at: now.toISOString(),
                discoverable: true,
              },
            ];
          if (table === "profiles")
            data.push({
              id: "other",
              display_name: "Михаил",
              created_at: now.toISOString(),
              discoverable: true,
            });
          if (table === "friendships")
            data = [
              {
                id: "f1",
                requester_id: uid,
                recipient_id: "other",
                status: "accepted",
                created_at: now.toISOString(),
              },
            ];
          if (table === "conversations")
            data = [
              {
                id: "c1",
                user_a: uid,
                user_b: "other",
                created_at: now.toISOString(),
              },
            ];
          if (table === "conversation_summaries")
            data = [
              {
                conversation_id: "c1",
                last_body: "Идеи для следующего релиза готовы.",
                last_at: now.toISOString(),
                unread: 1,
              },
            ];
          if (table === "messages")
            data = [
              {
                id: "m1",
                conversation_id: "c1",
                sender_id: "other",
                body: "Идеи для следующего релиза готовы.",
                created_at: now.toISOString(),
              },
              {
                id: "m2",
                conversation_id: "c1",
                sender_id: uid,
                body: "Отлично. Соберём их в заметку и обсудим на встрече.",
                created_at: now.toISOString(),
              },
            ];
          if (table === "notes" || table === "search_notes")
            data = [
              {
                id: "n1",
                title: "MEMORA — следующий шаг",
                content:
                  "Собрать идеи для нового проекта.\nСфокусироваться на том, что имеет значение.",
                tags: ["проект", "идеи"],
                favorite: true,
                scheduled_on: key,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
              },
              {
                id: "n2",
                title: "Что стоит прочитать",
                content:
                  "Заметки о дизайне систем, внимании и работе с информацией.",
                tags: ["чтение"],
                favorite: false,
                scheduled_on: key,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
              },
            ];
          if (table === "events")
            data = [
              {
                id: "e1",
                title: "Обсудить следующий релиз",
                description: "Дизайн и приоритеты.",
                starts_at: key + "T16:00:00",
                ends_at: key + "T17:00:00",
              },
            ];
          if (table === "settings")
            data = [
              { user_id: uid, notify_messages: true, notify_friends: true },
            ];
          if (table === "notifications")
            data = [
              {
                id: "notif1",
                user_id: uid,
                actor_id: uid,
                kind: "friend_accepted",
                read: false,
                created_at: now.toISOString(),
              },
            ];
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: {
              "content-range": `0-1/${table === "notes" ? 2 : table === "events" ? 1 : 0}`,
            },
            body: req.method() === "HEAD" ? "" : JSON.stringify(data),
          });
        },
      );
      await page.reload();
      await page
        .getByRole("heading", { name: "Здравствуйте, Анна." })
        .waitFor();
      await page.keyboard.press("Control+k");
      await expect(page.getByLabel("Быстрый поиск")).toBeFocused();
      await page.getByLabel("Быстрый поиск").blur();
      for (const route of [
        "home",
        "notes",
        "calendar",
        "chats",
        "profile",
        "settings",
        "notifications",
      ]) {
        await page.goto("/#" + route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("main.content")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        if (route === "chats") {
          await page.locator(".social .event-row").first().click();
          await expect(page.locator(".bubble")).toHaveCount(2);
        }
        const contrast = await page.evaluate(() => {
          const rgb = (v: string) =>
            v
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((x) => {
                x /= 255;
                return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
              });
          const luminance = (s: string) => {
            const [r, g, b] = rgb(s);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const st = getComputedStyle(document.body),
            a = luminance(st.color),
            b = luminance(st.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        expect(contrast).toBeGreaterThan(7);
        await page.screenshot({
          path: `video-assets/after/premium-${theme}-${route}-${width}-fixture.png`,
          fullPage: true,
        });
      }
      await page.goto("/#notes");
      await page
        .getByRole("button", { name: "Новая заметка", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCSS(
        "animation-name",
        "none",
      );
      await page.screenshot({
        path: `video-assets/after/premium-${theme}-editor-${width}-fixture.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
