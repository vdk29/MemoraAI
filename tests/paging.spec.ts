import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001",
  foreign = "10000000-0000-4000-8000-000000000099";
test("load next note page and fetch a foreign profile directly", async ({
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
  let directProfile = false;
  await page.route(
    "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
    async (route) => {
      const url = new URL(route.request().url()),
        table = url.pathname.split("/").pop();
      let data: any = [];
      if (table === "notes")
        data = Array.from(
          { length: Number(url.searchParams.get("offset") || 0) > 0 ? 1 : 50 },
          (_, i) => ({
            id: "note-" + (i + Number(url.searchParams.get("offset") || 0)),
            title:
              "Запись " + (i + Number(url.searchParams.get("offset") || 0)),
            content: "Текст",
            tags: [],
            created_at: "2026-11-03T12:00:00Z",
            updated_at: "2026-11-03T12:00:00Z",
          }),
        );
      if (table === "profiles") {
        if (url.searchParams.get("id") === "eq." + foreign) {
          directProfile = true;
          data = {
            id: foreign,
            display_name: "Другой участник",
            bio: "Описание профиля",
            created_at: "2026-11-03T12:00:00Z",
          };
        } else
          data = [
            {
              id: uid,
              display_name: "Владелец",
              created_at: "2026-11-03T12:00:00Z",
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
  await expect(page.locator(".note")).toHaveCount(50);
  await page.getByRole("button", { name: "Загрузить ещё: заметки" }).click();
  await expect(page.locator(".note")).toHaveCount(51);
  await page.goto("/#profile/" + foreign);
  await expect(
    page.getByRole("heading", { name: "Другой участник" }),
  ).toBeVisible();
  expect(directProfile).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Сохранить профиль" }),
  ).toHaveCount(0);
});
