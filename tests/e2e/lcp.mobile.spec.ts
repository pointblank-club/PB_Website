import { expect, test } from "@playwright/test";

// 4 s is where Google's "poor" LCP band starts. Override with LCP_BUDGET_MS.
const LCP_BUDGET_MS = Number(process.env.LCP_BUDGET_MS ?? 4000);

// Roughly a fast 4G connection on a mid-range phone.
const NETWORK = { offline: false, latency: 150, downloadThroughput: 9_000_000 / 8, uploadThroughput: 1_500_000 / 8 };
const CPU_SLOWDOWN = 4;

type Lcp = { time: number; element: string };

test("homepage LCP stays under budget on a throttled phone", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "throttling and LCP entries need Chromium");

  await page.addInitScript(() => {
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1) as PerformanceEntry & { element?: Element | null };
      const el = entry.element;
      (window as unknown as { __lcp: Lcp }).__lcp = {
        time: entry.startTime,
        element: !el
          ? "unknown"
          : el instanceof HTMLImageElement
            ? `img ${decodeURIComponent(el.currentSrc).match(/[^/]+\.(webp|png|jpe?g|svg|avif)/)?.[0] ?? el.currentSrc}`
            : `${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 40)}"`,
      };
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  // The first visit after a build makes Next encode every image size; measure a returning server, not that.
  await page.goto("/", { waitUntil: "load" });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.clearBrowserCache");
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  await page.goto("/", { waitUntil: "load" });
  // LCP can still move to a later, larger paint just after load.
  await page.waitForTimeout(1000);

  const lcp = await page.evaluate(() => (window as unknown as { __lcp?: Lcp }).__lcp);
  expect(lcp, "no largest-contentful-paint entry was recorded").toBeDefined();
  test.info().annotations.push({ type: "LCP", description: `${Math.round(lcp!.time)} ms (${lcp!.element})` });
  console.log(`LCP ${Math.round(lcp!.time)} ms on ${lcp!.element}`);

  expect(lcp!.time, `LCP element: ${lcp!.element}`).toBeLessThanOrEqual(LCP_BUDGET_MS);
});
