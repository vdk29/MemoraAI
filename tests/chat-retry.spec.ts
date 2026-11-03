import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  cid = "40000000-0000-4000-8000-000000000001";
test("ambiguous delivery retries the same message and renders it once", async ({
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
  let stored: any = null;
  const ids: string[] = [];
  await page.route(
    "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        table = url.pathname.split("/").pop();
      let data: any = [];
      if (table === "profiles")
        data = [
          { id: uid, display_name: "Я", created_at: new Date().toISOString() },
          {
            id: other,
            display_name: "Мария",
            created_at: new Date().toISOString(),
          },
        ];
      if (table === "settings")
        data = [{ user_id: uid, notify_messages: false, notify_friends: true }];
      if (table === "friendships")
        data = [
          {
            id: "f1",
            requester_id: uid,
            recipient_id: other,
            status: "accepted",
          },
        ];
      if (table === "conversations")
        data = [
          {
            id: cid,
            user_a: uid,
            user_b: other,
            created_at: new Date().toISOString(),
          },
        ];
      if (table === "messages") {
        if (req.method() === "POST") {
          const message = req.postDataJSON();
          ids.push(message.id);
          if (!stored) {
            stored = { ...message, created_at: new Date().toISOString() };
            await route.abort("failed");
            return;
          }
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ code: "23505", message: "duplicate key" }),
          });
          return;
        }
        data = url.searchParams.has("id") ? stored : stored ? [stored] : [];
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },
  );
  await page.goto("/#chats");
  await page.getByRole("button", { name: "Мария", exact: true }).click();
  await page
    .getByLabel("Сообщение", { exact: true })
    .fill("Одна мысль — одно сообщение");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Сообщение", { exact: true })).toHaveValue(
    "Одна мысль — одно сообщение",
  );
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.locator(".bubble")).toHaveCount(1);
  await expect(page.getByLabel("Сообщение", { exact: true })).toHaveValue("");
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
