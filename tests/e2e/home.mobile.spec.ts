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

  test("fog starts without errors", async ({ page }) => {
    const fogWarnings: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Hero fog unavailable")) fogWarnings.push(msg.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.reload();

    const canvases = page.locator("#home canvas");
    await expect(canvases).toHaveCount(2);

    // CI browsers draw WebGL in software, if at all: without WebGL2 there is no fog to check.
    const webgl2 = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
    test.skip(!webgl2, "this browser build has no WebGL2");

    // A CloudScene resizes its canvas from the 300x150 default once it is running.
    await expect
      .poll(() => canvases.evaluateAll((els) => (els as HTMLCanvasElement[]).every((c) => c.width !== 300 || c.height !== 150)), {
        timeout: 15_000,
      })
      .toBe(true);
    expect(fogWarnings).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("page does not scroll sideways", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
