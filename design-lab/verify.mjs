import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const out = new URL("./evidence/", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const checks = [];
for (const concept of ["a", "b"])
  for (const theme of ["dark", "light"])
    for (const [device, width, height] of [
      ["desktop", 1440, 1000],
      ["iphone", 390, 844],
    ]) {
      const context = await browser.newContext({
          viewport: { width, height },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      console.log(concept, theme, device);
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://localhost:5190/?concept=${concept}&theme=${theme}`,
      );
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".note-card").first().waitFor();
      async function shot(name) {
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${concept}/${theme}/${device}/${name} overflows`,
        );
        await page.locator(".toast").waitFor({ state: "hidden" });
        await page.screenshot({
          path: out + `${concept}-${theme}-${device}-${name}.png`,
          fullPage: device === "desktop",
          animations: "disabled",
        });
      }
      await shot("home");
      await page.locator(".note-card").first().click();
      await page.getByRole("dialog", { name: "Редактор заметки" }).waitFor();
      await shot("note");
      await page
        .getByRole("button", { name: "Закрыть заметку", exact: true })
        .click();
      await page.keyboard.press("Control+k");
      const search = page.getByRole("textbox", {
        name: "Найти заметку или команду",
      });
      await search.fill("глубокой");
      await page.keyboard.press("Enter");
      await page.getByRole("dialog", { name: "Редактор заметки" }).waitFor();
      assert.equal(
        await page.getByLabel("Название заметки").inputValue(),
        "О внимании и глубокой работе",
      );
      await page.keyboard.press("Escape");
      await page
        .getByLabel("Быстрая заметка", { exact: true })
        .pressSequentially("Проверка живого ввода", { delay: 8 });
      assert.equal(
        await page.getByLabel("Быстрая заметка", { exact: true }).inputValue(),
        "Проверка живого ввода",
      );
      await page
        .locator(".capture")
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      assert.equal(await page.locator(".note-card").count(), 5);
      await page.keyboard.press("Control+k");
      await search.fill("Новая заметка");
      await page.keyboard.press("Enter");
      try {
        await page.getByLabel("Название заметки").fill("Сохранённая локально");
      } catch (e) {
        await page.screenshot({ path: out + "failure.png" });
        console.log(await page.locator("body").innerText());
        throw e;
      }
      await page
        .getByLabel("Текст заметки")
        .fill("Изменения прототипа не затрагивают реальную MEMORA.");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await page.reload();
      await page.locator(".note-card").first().waitFor();
      assert.equal(await page.locator(".note-card").count(), 6);
      await page.keyboard.press("Control+k");
      await search.fill("Календарь");
      await page.keyboard.press("Enter");
      await page.locator(".large-calendar").waitFor();
      assert.equal(await page.locator(".calendar-grid>button").count(), 42);
      await page.getByRole("button", { name: "Следующий месяц" }).click();
      assert(
        (await page.locator(".mini-calendar header").textContent()).includes(
          "Декабрь",
        ),
      );
      await page.keyboard.press("Control+k");
      await search.fill("Чаты и друзья");
      await page.keyboard.press("Enter");
      await page
        .getByRole("dialog", { name: "Демонстрационная переписка" })
        .waitFor();
      await page
        .getByLabel("Сообщение", { exact: true })
        .fill("Хорошая идея. Сохраним её.");
      await page.getByRole("button", { name: "Отправить сообщение" }).click();
      assert.equal(await page.locator(".bubble").count(), 2);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+k");
      await search.fill("Пустое пространство");
      await page.keyboard.press("Enter");
      await page.locator(".empty-library").waitFor();
      await shot("empty");
      await page.keyboard.press("Control+k");
      await search.fill("Восстановить демоданные");
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".note-card").count(), 4);
      await page
        .locator(".preview-dock")
        .getByRole("button", { name: "Вход", exact: true })
        .click();
      await page.locator(".auth-form").waitFor();
      await shot("auth");
      await page
        .getByRole("button", { name: "Открыть демо-пространство" })
        .click();
      await page.locator(".dashboard").waitFor();
      await page
        .getByRole("button", { name: "Системная тема", exact: true })
        .click();
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "light",
      );
      await page.getByRole("button", { name: "Переключить тему" }).click();
      if (theme === "light")
        await page.getByRole("button", { name: "Переключить тему" }).click();
      assert.deepEqual(errors, []);
      checks.push(
        `${concept}/${theme}/${device}: layout, command search/action, typing, save/reload, calendar, chat, empty, auth`,
      );
      await context.close();
    }
await fs.writeFile(
  out + "verification.json",
  JSON.stringify(
    {
      date: "2026-11-04",
      checks,
      backend: "none; standalone local demonstration; no Supabase requests",
    },
    null,
    2,
  ),
);
await browser.close();
console.log(`${checks.length} complete prototype scenarios passed`);
