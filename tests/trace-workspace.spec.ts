// Interface integration test with a mocked Supabase transport, not live Auth/Realtime.
import { test as base, expect } from "@playwright/test";
const test = base.extend({
  page: async ({ browser }, use, testInfo) => {
    const width = Number(testInfo.title.match(/(1440|390)$/)?.[1] || 1440);
    const context = await browser.newContext({
      baseURL: "http://localhost:5173",
      viewport: { width, height: 900 },
      recordVideo: {
        dir: testInfo.outputPath("raw-video"),
        size: { width, height: 900 },
      },
    });
    const page = await context.newPage();
    const video = page.video();
    try {
      await use(page);
    } finally {
      await context.close();
      if (testInfo.status === testInfo.expectedStatus)
        await video?.saveAs(
          `video-assets/clips/trace-interactions-${width}-fixture.webm`,
        );
    }
  },
});
for (const width of [1440, 390])
  test(`Trace command search, note covers and view modes ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const uid = "10000000-0000-4000-8000-000000000001";
    const now = new Date().toISOString();
    let notes: any[] = [];
    const remote = {
      id: "remote",
      user_id: uid,
      title: "Глубокая работа",
      content: "Найдена за пределами загруженной страницы",
      tags: [],
      favorite: false,
      created_at: now,
      updated_at: now,
    };
    await page.addInitScript(
      ({ uid }) => {
        localStorage.setItem("memora-theme", "dark");
        localStorage.setItem(
          "sb-ewsqrqzabahjtmorrqhh-auth-token",
          JSON.stringify({
            access_token: "fixture",
            refresh_token: "fixture",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: uid, aud: "authenticated", role: "authenticated" },
          }),
        );
      },
      { uid },
    );
    let searched = "";
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
              created_at: now,
              discoverable: true,
              bio: "",
            },
          ];
        if (table === "settings")
          data = [
            { user_id: uid, notify_messages: true, notify_friends: true },
          ];
        if (table === "search_notes") {
          searched = req.postDataJSON().query_text;
          data = searched === "Глубокая" ? [remote] : [];
        }
        if (table === "notes") {
          if (req.method() === "POST")
            notes.push({
              ...req.postDataJSON(),
              id: "n1",
              created_at: now,
              updated_at: now,
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
    await page.goto("/");
    await page.getByRole("heading", { name: /Ваши мысли/ }).waitFor();
    // The keyboard shortcut is available on all private routes, including mobile.
    await page.keyboard.press("Control+k");
    let palette = page.getByRole("dialog", { name: "Команды MEMORA" });
    await expect(palette).toBeVisible();
    await palette
      .getByRole("button", { name: "Новая заметка", exact: true })
      .click();
    let editor = page.getByRole("dialog", { name: "Новая заметка" });
    await editor
      .getByLabel("Название", { exact: true })
      .fill("Сохранить важное");
    await editor
      .getByLabel("Текст", { exact: true })
      .fill("Важные мысли обретают форму.");
    await editor.getByLabel("Обложка заметки").selectOption("memory");
    await expect(editor.locator(".trace-note-cover")).toBeVisible();
    await editor
      .getByRole("button", { name: "Сохранить", exact: true })
      .click();
    await expect.poll(() => notes[0]?.cover).toBe("memory");
    await page.goto("/#notes");
    await expect(page.locator(".note.has-cover")).toHaveCount(1);
    await page.getByRole("button", { name: "Список", exact: true }).click();
    await expect(page.locator(".trace-list")).toBeVisible();
    await page.getByRole("button", { name: "Карточки", exact: true }).click();
    await expect(page.locator(".trace-grid")).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", {
        name: "Открыть заметку Сохранить важное",
        exact: true,
      })
      .click();
    editor = page.getByRole("dialog", { name: "Редактировать заметку" });
    await expect(editor.getByLabel("Обложка заметки")).toHaveValue("memory");
    await expect(editor).toHaveClass(/trace-spatial/);
    await page.screenshot({
      path: `video-assets/after/trace-cover-editor-${width}-fixture.png`,
      fullPage: true,
    });
    await editor.getByLabel("Обложка заметки").selectOption("");
    await editor
      .getByRole("button", { name: "Сохранить", exact: true })
      .click();
    await expect.poll(() => notes[0]?.cover).toBe(null);
    await expect(page.locator(".note.has-cover")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    palette = page.getByRole("dialog", { name: "Команды MEMORA" });
    await palette.getByRole("textbox").fill("Глубокая");
    await expect(
      palette.getByRole("button", { name: "Глубокая работа" }),
    ).toBeVisible();
    expect(searched).toBe("Глубокая");
    await page.screenshot({
      path: `video-assets/after/trace-command-${width}-fixture.png`,
      fullPage: true,
    });
    await palette.getByRole("textbox").press("Enter");
    await expect(page.getByLabel("Название", { exact: true })).toHaveValue(
      "Глубокая работа",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    palette = page.getByRole("dialog", { name: "Команды MEMORA" });
    await palette.getByRole("textbox").fill("Календарь");
    await expect(
      palette.getByRole("button", { name: "Календарь", exact: true }),
    ).toBeVisible();
    await palette
      .getByRole("button", { name: "Календарь", exact: true })
      .click();
    await expect(page).toHaveURL(/#calendar$/);
    await page.keyboard.press("Control+k");
    palette = page.getByRole("dialog", { name: "Команды MEMORA" });
    await palette.getByRole("textbox").fill("Светлая тема");
    await palette
      .getByRole("button", { name: "Светлая тема", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
