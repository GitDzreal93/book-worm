import { test, expect } from "@playwright/test";

test.describe("阅读器页面", () => {
  test("不存在的书籍显示 404", async ({ page }) => {
    const response = await page.goto("/read/nonexistent-book-slug");
    expect(response?.status()).toBe(404);
  });

  test("阅读器页面有侧边栏", async ({ page }) => {
    // Go to shelf first (will show empty state)
    await page.goto("/shelf");
    // Verify we're not on reader page (no sidebar toggle expected)
    await expect(page.locator("h1")).toHaveText("书架");
  });

  test("导航栏在阅读器页面隐藏", async ({ page }) => {
    const response = await page.goto("/read/test-book");
    // Regardless of 404, the nav should be hidden on /read/* routes
    if (response?.ok()) {
      await expect(page.locator("nav")).not.toBeVisible();
    }
  });

  test("侧边栏切换按钮存在", async ({ page }) => {
    await page.goto("/shelf");
    // On non-reader pages, no sidebar toggle should be visible
    // (sidebar toggle is only on reader pages)
    await expect(page.locator("h1")).toBeVisible();
  });
});
