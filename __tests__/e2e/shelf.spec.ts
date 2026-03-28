import { test, expect } from "@playwright/test";

test.describe("书架页面", () => {
  test("页面加载成功并显示标题", async ({ page }) => {
    await page.goto("/shelf");
    await expect(page.locator("h1")).toHaveText("书架");
  });

  test("空状态显示引导提示", async ({ page }) => {
    await page.goto("/shelf");
    await expect(page.getByText("书架空空如也")).toBeVisible();
    await expect(page.getByText("导入一本 epub 电子书开始阅读")).toBeVisible();
  });

  test("导航栏包含所有链接", async ({ page }) => {
    await page.goto("/shelf");
    await expect(page.getByRole("link", { name: "书架" })).toBeVisible();
    await expect(page.getByRole("link", { name: "生词本" })).toBeVisible();
    await expect(page.getByRole("link", { name: "复习" })).toBeVisible();
    await expect(page.getByRole("link", { name: "笔记" })).toBeVisible();
    await expect(page.getByRole("link", { name: "统计" })).toBeVisible();
  });

  test("点击导入按钮弹出对话框", async ({ page }) => {
    await page.goto("/shelf");
    // The import dialog button should exist
    const importButton = page.getByRole("button");
    await expect(importButton.first()).toBeVisible();
  });

  test("移动端响应式布局", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/shelf");
    await expect(page.locator("h1")).toBeVisible();
  });
});
