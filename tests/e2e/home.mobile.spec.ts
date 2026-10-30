import { expect, test } from "@playwright/test";

test.describe("homepage on phones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero heading, tagline and award render", async ({ page }) => {
    const hero = page.locator("#home");
    await expect(hero.getByRole("heading", { level: 1 })).toContainText("Point");
    await expect(hero.getByText("Student run Open Source Community from India")).toBeVisible();

    const award = hero.getByRole("link", { name: /Student Community of the Year/ });
    await expect(award).toBeVisible();
    await expect(award).toHaveAttribute("href", "/achievements");
    await expect(hero.getByRole("img", { name: "IndiaFOSS 2026" })).toBeVisible();
    await expect(hero.getByRole("img", { name: "FOSS United" })).toBeVisible();
  });

  test("every hero image loads", async ({ page }) => {
    const images = page.locator("#home img");
    await expect(images.first()).toBeAttached();
    await expect
      .poll(() =>
        images.evaluateAll((els) =>
          (els as HTMLImageElement[]).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
        ),
      )
      .toEqual([]);
  });

  test("page does not scroll sideways", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
