import { test, expect } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001";
for (const width of [1440, 390])
  test(`forest calendar notes, events, alignment and account menu ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
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
    const today = new Date(),
      key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let notes: any[] = [
      {
        id: "n1",
        title: "Идеи для спокойного утра",
        content:
          "Сначала прогулка. Потом — одна важная мысль.\nОставить время для себя и своих планов.",
        tags: ["личное", "вдохновение"],
        scheduled_on: key,
        favorite: true,
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
      },
      {
        id: "n2",
        title: "Книги, к которым хочется вернуться",
        content: "Список книг и идей для следующего месяца.",
        tags: ["чтение"],
        scheduled_on: key,
        favorite: false,
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
      },
    ];
    let events: any[] = [
      {
        id: "e1",
        title: "Время для нового проекта",
        description: "Обсудить идеи и следующий шаг.",
        starts_at: key + "T14:00:00",
        ends_at: key + "T15:00:00",
      },
    ];
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
              display_name: "Анна",
              bio: "Мысли, планы и немного вдохновения.",
              created_at: today.toISOString(),
              discoverable: true,
            },
          ];
        if (table === "settings")
          data = [
            { user_id: uid, notify_messages: true, notify_friends: true },
          ];
        if (table === "notes") {
          if (req.method() === "POST")
            notes.push({
              ...req.postDataJSON(),
              id: "n" + (notes.length + 1),
              created_at: today.toISOString(),
              updated_at: today.toISOString(),
            });
          data = notes;
        }
        if (table === "events") {
          if (req.method() === "POST")
            events.push({ ...req.postDataJSON(), id: "e2" });
          data = events;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "content-range": `0-1/${table === "notes" ? notes.length : table === "events" ? events.length : 0}`,
          },
          body: req.method() === "HEAD" ? "" : JSON.stringify(data),
        });
      },
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Ваши мысли/ }),
    ).toBeVisible();
    await expect(page.locator("nav>a")).toHaveCount(4);
    await expect(page.locator("nav")).not.toContainText("События");
    await page.screenshot({
      path: `video-assets/after/trace-depth-regression-dashboard-${width}-fixture.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Новая заметка", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page
        .locator(".overlay")
        .evaluate((el) => el.parentElement === document.body),
    ).toBeTruthy();
    await page
      .getByLabel("Название", { exact: true })
      .fill("Заметка с главной");
    await page
      .getByLabel("Текст", { exact: true })
      .fill("Окно находится над всеми карточками.");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Сохранить", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/#calendar");
    await expect(page.locator(".month-grid .day-cell")).toHaveCount(42);
    await expect(
      page
        .locator(".note-chip")
        .filter({ hasText: "Идеи для спокойного утра" }),
    ).toBeVisible();
    const sizes = await page
      .locator(".month-grid .day-cell")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1.1);
    const heights = await page
      .locator(".month-grid .day-cell")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1.1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page
      .locator(".note-chip")
      .filter({ hasText: "Идеи для спокойного утра" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Оставить время для себя",
    );
    await page.screenshot({
      path: `video-assets/after/trace-depth-regression-note-expanded-${width}-fixture.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Заметка на этот день" }).click();
    await expect(page.getByLabel("День в календаре")).toHaveValue(key);
    await page
      .getByLabel("Название", { exact: true })
      .fill("Мысль на выбранный день");
    await page
      .getByLabel("Текст", { exact: true })
      .fill("Календарь помогает собрать всё важное.");
    await expect(page.getByLabel("Текст", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(notes.at(-1).scheduled_on).toBe(key);
    await page
      .getByRole("button", { name: "Создать событие", exact: true })
      .click();
    await page
      .getByLabel("Название", { exact: true })
      .fill("Новое событие в календаре");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page
        .locator(".agenda-event")
        .filter({ hasText: "Новое событие в календаре" }),
    ).toBeVisible();
    await page.screenshot({
      path: `video-assets/after/trace-depth-regression-calendar-${width}-fixture.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.locator(".account-menu>summary").click();
    await page.getByRole("link", { name: "Настройки", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Настройки профиля" }),
    ).toBeVisible();
  });
