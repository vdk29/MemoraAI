import { test, expect } from "@playwright/test";
import { socialBackend, alice, boris } from "./helpers/social-fixture";

for (const width of [1440, 390])
  test(`friends and bidirectional messaging ${width}`, async ({ browser }) => {
    const backend = socialBackend();
    const a = await browser.newContext({
      baseURL: "http://localhost:5173",
      viewport: { width, height: 900 },
      recordVideo: {
        dir: "test-results/social-clips",
        size: { width, height: 900 },
      },
    });
    const b = await browser.newContext({
      baseURL: "http://localhost:5173",
      viewport: { width, height: 900 },
    });
    try {
      await backend.attach(a, alice);
      await backend.attach(b, boris);
      const anna = await a.newPage(),
        bor = await b.newPage();
      const errors: string[] = [];
      anna.on("pageerror", (e) => errors.push(e.message));
      bor.on("pageerror", (e) => errors.push(e.message));
      await anna.goto("/#chats");
      await bor.goto("/#chats");
      await anna.getByRole("heading", { name: "Люди и переписки" }).waitFor();
      await anna.screenshot({
        path: `video-assets/after/social-empty-${width}-fixture.png`,
        fullPage: true,
      });
      await anna
        .getByRole("button", { name: "Добавить друга", exact: true })
        .first()
        .click();
      await anna.getByLabel("Поиск пользователей").fill("Бор");
      const result = anna
        .locator(".search-result")
        .filter({ hasText: "Борис" });
      await expect(result).toBeVisible();
      await result
        .getByRole("button", { name: "Добавить в друзья", exact: true })
        .click();
      await expect(
        result.getByRole("button", { name: "Отменить заявку" }),
      ).toBeVisible();
      expect(backend.friendshipPosts).toBe(1);
      await bor.getByRole("tab", { name: /Люди/ }).click();
      await expect(
        bor.locator(".request-card").filter({ hasText: "Анна" }),
      ).toBeVisible();
      await bor
        .locator(".request-card")
        .getByRole("button", { name: "Принять", exact: true })
        .click();
      await expect(
        bor.locator(".social-person").filter({ hasText: "В друзьях" }),
      ).toHaveCount(1);
      await expect(
        result.getByRole("button", { name: "Написать", exact: true }),
      ).toBeVisible();
      await anna.screenshot({
        path: `video-assets/after/social-people-${width}-fixture.png`,
        fullPage: true,
      });
      await result
        .getByRole("button", { name: "Написать", exact: true })
        .click();
      await expect(anna.getByLabel("Сообщение", { exact: true })).toBeVisible();
      await expect.poll(() => backend.chatSubscriptions(alice)).toBe(1);
      await anna
        .getByLabel("Сообщение", { exact: true })
        .fill("Привет! Давай обсудим новую идею.");
      await anna
        .getByRole("button", { name: "Отправить", exact: true })
        .click();
      await expect(anna.locator(".bubble")).toHaveCount(1);
      await bor.getByRole("tab", { name: "Переписки", exact: true }).click();
      await expect(
        bor.getByRole("button", { name: "Переписка: Анна" }),
      ).toBeVisible();
      await bor.getByRole("button", { name: "Переписка: Анна" }).click();
      await expect(bor.locator(".bubble")).toHaveCount(1);
      await bor
        .getByLabel("Сообщение", { exact: true })
        .fill("Привет! Я на связи. Рассказывай.");
      await bor.getByRole("button", { name: "Отправить", exact: true }).click();
      // No reload: the other page receives the mocked WebSocket event, twice.
      await expect(anna.locator(".bubble")).toHaveCount(2);
      await expect(bor.locator(".bubble")).toHaveCount(2);
      expect(backend.messages).toHaveLength(2);
      await expect(anna.getByLabel("Сообщение", { exact: true })).toHaveValue(
        "",
      );
      await anna.screenshot({
        path: `video-assets/after/social-messages-dark-${width}-fixture.png`,
        fullPage: true,
      });
      await anna
        .getByRole("button", { name: "Светлая тема", exact: true })
        .click();
      await anna.screenshot({
        path: `video-assets/after/social-messages-light-${width}-fixture.png`,
        fullPage: true,
      });
      expect(
        await anna.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await anna.reload();
      // Starting a conversation from a foreign profile selects the actual peer.
      await anna.goto("/#profile/" + boris);
      await anna
        .getByRole("link", { name: "Написать сообщение", exact: true })
        .click();
      await expect(anna).toHaveURL(new RegExp("#chats/" + boris + "$"));
      await expect(anna.locator(".bubble")).toHaveCount(2);
      await expect.poll(() => backend.chatSubscriptions(alice)).toBe(1);
      if (width === 390) {
        await anna.getByRole("button", { name: "Назад к перепискам" }).click();
        await expect(
          anna.getByRole("button", { name: "Переписка: Борис" }),
        ).toBeVisible();
        await anna.getByRole("button", { name: "Переписка: Борис" }).click();
      }
      await expect.poll(() => backend.chatSubscriptions(alice)).toBe(1);
      expect(errors).toEqual([]);
      await a.close();
      await anna
        .video()
        ?.saveAs(
          `video-assets/clips/social-friends-messages-${width}-fixture.webm`,
        );
    } finally {
      await a.close();
      await b.close();
    }
  });

test("cancel and decline friend requests; ID search resolves the same user", async ({
  browser,
}) => {
  const backend = socialBackend();
  const a = await browser.newContext({ baseURL: "http://localhost:5173" });
  const b = await browser.newContext({ baseURL: "http://localhost:5173" });
  try {
    await backend.attach(a, alice);
    await backend.attach(b, boris);
    const anna = await a.newPage(),
      bor = await b.newPage();
    await anna.goto("/#chats");
    await bor.goto("/#chats");
    await anna.getByRole("tab", { name: /Люди/ }).click();
    await anna.getByLabel("Поиск пользователей").fill(boris);
    const result = anna.locator(".search-result");
    await expect(result).toContainText("Борис");
    await result.getByRole("button", { name: "Добавить в друзья" }).click();
    await result.getByRole("button", { name: "Отменить заявку" }).click();
    await expect(
      result.getByRole("button", { name: "Добавить в друзья" }),
    ).toBeVisible();
    await result.getByRole("button", { name: "Добавить в друзья" }).click();
    await bor.getByRole("tab", { name: /Люди/ }).click();
    await bor
      .locator(".request-card")
      .getByRole("button", { name: "Отклонить" })
      .click();
    await expect(
      result.getByRole("button", { name: "Добавить в друзья" }),
    ).toBeVisible();
    await expect(bor.locator(".request-card")).toHaveCount(0);
    expect(backend.friendshipPosts).toBe(2);
  } finally {
    await a.close();
    await b.close();
  }
});

test("open chat receives new messages through fallback when WebSocket is unavailable", async ({
  browser,
}) => {
  const backend = socialBackend();
  backend.seedFriends();
  const a = await browser.newContext({ baseURL: "http://localhost:5173" });
  const b = await browser.newContext({ baseURL: "http://localhost:5173" });
  try {
    await backend.attach(a, alice, false);
    await backend.attach(b, boris);
    const anna = await a.newPage(),
      bor = await b.newPage();
    await anna.clock.install();
    await anna.goto("/#chats");
    await bor.goto("/#chats");
    await anna.getByRole("button", { name: "Переписка: Борис" }).click();
    await bor.getByRole("button", { name: "Переписка: Анна" }).click();
    await expect(anna.getByLabel("Сообщение", { exact: true })).toBeVisible();
    await bor
      .getByLabel("Сообщение", { exact: true })
      .fill("Сообщение при недоступном WebSocket");
    await bor.getByRole("button", { name: "Отправить", exact: true }).click();
    await expect(bor.locator(".bubble")).toHaveCount(1);
    await expect(anna.locator(".bubble")).toHaveCount(0);
    await anna.clock.fastForward(8100);
    await expect(anna.locator(".bubble")).toHaveCount(1);
    await expect(anna.locator(".bubble")).toContainText(
      "Сообщение при недоступном WebSocket",
    );
  } finally {
    await a.close();
    await b.close();
  }
});
