// Raw reference capture only. No montage, audio, or simulated live backend.
// Requires old main served on :5180 and current Vite app on :5173.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const uid = "10000000-0000-4000-8000-000000000001";
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: "video-assets/clips", size: { width: 390, height: 844 } },
});
await context.addInitScript(
  ({ uid }) =>
    localStorage.setItem(
      "sb-ewsqrqzabahjtmorrqhh-auth-token",
      JSON.stringify({
        access_token: "recording-fixture",
        refresh_token: "fixture",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: uid, aud: "authenticated", role: "authenticated" },
      }),
    ),
  { uid },
);
let notes = [];
await context.route(
  "https://ewsqrqzabahjtmorrqhh.supabase.co/**",
  async (route) => {
    const req = route.request(),
      table = new URL(req.url()).pathname.split("/").pop();
    let data = [];
    if (table === "profiles")
      data = [
        {
          id: uid,
          display_name: "Анна",
          bio: "Идеи, которым хочется дать время.",
          discoverable: true,
          created_at: "2026-11-03T12:00:00Z",
        },
      ];
    if (table === "settings")
      data = [{ user_id: uid, notify_messages: true, notify_friends: true }];
    if (table === "notes") {
      if (req.method() === "POST")
        notes.push({
          ...req.postDataJSON(),
          id: "recording-note",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (req.method() === "PATCH")
        notes = notes.map((n) => ({ ...n, ...req.postDataJSON() }));
      data = notes;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  },
);
const page = await context.newPage();
await page.goto("http://localhost:5174");
await page.getByRole("heading", { name: "Здравствуйте, Анна." }).waitFor();
await page.screenshot({
  path: "video-assets/after/forest-home-vertical-fixture.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Новая заметка" }).click();
await page
  .getByLabel("Название", { exact: true })
  .pressSequentially("Идеи для спокойного утра", { delay: 55 });
await page
  .getByLabel("Текст", { exact: true })
  .pressSequentially(
    "Начать день с прогулки. Записать одну важную мысль. Оставить время для себя.",
    { delay: 35 },
  );
await page.screenshot({
  path: "video-assets/development/forest-note-editor-vertical-fixture.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Сохранить", exact: true }).click();
await page.getByRole("heading", { name: "Идеи для спокойного утра" }).waitFor();
await page.getByRole("button", { name: "Избранное", exact: true }).click();
await page.screenshot({
  path: "video-assets/after/forest-home-with-note-vertical-fixture.png",
  fullPage: true,
});
await page.goto("http://localhost:5174/#calendar");
await page.getByRole("button", { name: "Следующий месяц" }).click();
await page.screenshot({
  path: "video-assets/after/forest-calendar-vertical-fixture.png",
  fullPage: true,
});
const video = page.video();
await context.close();
await fs.rename(
  await video.path(),
  "video-assets/clips/forest-note-create-favorite-calendar-fixture.webm",
);
await browser.close();
