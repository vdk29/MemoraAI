import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001";
test("search includes unloaded notes and calendar fetches the displayed month", async ({
  page,
}) => {
  await page.addInitScript(
    ({ uid }) =>
      localStorage.setItem(
        "sb-ewsqrqzabahjtmorrqhh-auth-token",
        JSON.stringify({
          access_token: "test-token",
          refresh_token: "test",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: uid, aud: "authenticated", role: "authenticated" },
        }),
      ),
    { uid },
  );
  const now = new Date(),
    eventDate = new Date(now.getFullYear(), now.getMonth() + 1, 15, 12);
  const endDate = new Date(eventDate.getTime() + 3600000);
  let searched = false,
    rangeQueried = false;
  await page.route(
    "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        table = url.pathname.split("/").pop();
      let data: any = [];
      if (table === "profiles")
        data = [
          { id: uid, display_name: "Участник", created_at: now.toISOString() },
        ];
      if (table === "search_notes") {
        searched = true;
        data = [
          {
            id: "distant",
            title: "Заметка вне первой страницы",
            content: "Найдено на сервере",
            tags: ["редкийтег"],
            favorite: false,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ];
      }
      if (table === "events" && url.searchParams.has("starts_at")) {
        rangeQueried = true;
        const parts = url.searchParams.getAll("starts_at");
        const lower = parts.find((p) => p.startsWith("gte."))?.slice(4);
        const upper = parts.find((p) => p.startsWith("lt."))?.slice(3);
        if (
          lower &&
          upper &&
          eventDate >= new Date(lower) &&
          eventDate < new Date(upper)
        )
          data = [
            {
              id: "future",
              title: "Событие следующего месяца",
              starts_at: eventDate.toISOString(),
              ends_at: endDate.toISOString(),
              description: "",
            },
          ];
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },
  );
  await page.goto("/#notes");
  await page.getByLabel("Быстрый поиск").fill("редкийтег");
  await expect(
    page.getByRole("heading", { name: "Заметка вне первой страницы" }),
  ).toBeVisible();
  expect(searched).toBeTruthy();
  await page.goto("/#calendar");
  await page.getByRole("button", { name: "Следующий месяц" }).click();
  await page.locator(".calendar button").filter({ hasText: /^15$/ }).click();
  await expect(
    page
      .locator(".event-chip")
      .filter({ hasText: "Событие следующего месяца" }),
  ).toBeVisible();
  expect(rangeQueried).toBeTruthy();
});
