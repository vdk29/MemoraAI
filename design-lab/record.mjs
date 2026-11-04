import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const root = new URL("./evidence/", import.meta.url).pathname;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
for (const concept of ["a", "b"])
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["iphone", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      recordVideo: { dir: root, size: { width, height } },
    });
    const page = await context.newPage();
    await page.goto(
      `http://localhost:5190/?concept=${concept}&theme=dark&screen=auth`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(550);
    await page
      .getByRole("button", { name: "Открыть демо-пространство" })
      .click();
    await page.locator(".note-card").first().waitFor();
    await page.waitForTimeout(550);
    await page.locator(".note-card").first().hover();
    await page.waitForTimeout(250);
    await page.locator(".note-card").first().click();
    await page.getByRole("dialog", { name: "Редактор заметки" }).waitFor();
    await page.waitForTimeout(700);
    await page
      .getByLabel("Текст заметки")
      .pressSequentially(" Идея становится началом.", { delay: 35 });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Сохранить", exact: true })
      .click();
    await page.waitForTimeout(450);
    await page.getByRole("button", { name: "Закрыть заметку" }).click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Control+k");
    await page
      .getByLabel("Найти заметку или команду")
      .pressSequentially("глубокой", { delay: 95 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: root + `${concept}-dark-${device}-commands.png`,
      fullPage: false,
    });
    await page.keyboard.press("Enter");
    await page.getByRole("dialog", { name: "Редактор заметки" }).waitFor();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Переключить тему" }).click();
    await page.waitForTimeout(650);
    const video = page.video();
    await context.close();
    const raw = root + `${concept}-${device}-interaction.webm`;
    await fs.rename(await video.path(), raw);
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      raw,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      root + `${concept}-${device}-interaction.mp4`,
    ]);
    console.log(`${concept}/${device}: recorded`);
  }
await browser.close();
