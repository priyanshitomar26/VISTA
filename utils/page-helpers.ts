import { Page, Locator } from '@playwright/test';
import { PageConfig } from '../config/pages.config';

/**
 * Navigate to a URL and wait for the page to be fully ready for screenshotting.
 */
export async function navigateAndWait(page: Page, url: string, config: PageConfig): Promise<void> {
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  // Extra settle time for heavy SPAs / ad-heavy pages
  await page.waitForTimeout(2000);

  // Wait for the specified selector — non-fatal so a missing element doesn't abort the test
  if (config.waitForSelector) {
    await page.waitForSelector(config.waitForSelector, { timeout: 15_000 }).catch(() => {});
  }

  // Dismiss any cookie banners / consent overlays
  await dismissCookieBanners(page);

  // Stop CSS animations & transitions for consistent screenshots
  await disableAnimations(page);

  // Extra wait for lazy-loaded images / fonts
  if (config.waitMs) {
    await page.waitForTimeout(config.waitMs);
  } else {
    await page.waitForTimeout(500);
  }

  // Scroll to bottom to trigger lazy loads, then back to top
  await scrollToTriggerLazyLoad(page);
}

/**
 * Build a Playwright mask array from CSS selector strings.
 */
export function buildMasks(page: Page, selectors: string[] = []): Locator[] {
  return selectors.map((sel) => page.locator(sel));
}

/**
 * Attempt to close common cookie / GDPR consent banners.
 */
async function dismissCookieBanners(page: Page): Promise<void> {
  const dismissSelectors = [
    '[id*="cookie"] button[class*="accept"]',
    '[id*="cookie"] button[class*="agree"]',
    '[class*="cookie-banner"] button',
    '[class*="consent"] button[class*="accept"]',
    '#onetrust-accept-btn-handler',
    '.js-cookie-accept',
    'button[data-testid="cookie-accept"]',
  ];

  for (const selector of dismissSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2_000 })) {
        await btn.click();
        await page.waitForTimeout(300);
        break;
      }
    } catch {
      // selector not found — move on
    }
  }
}

/**
 * Inject CSS to freeze animations and transitions.
 */
async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

/**
 * Scroll to the bottom of the page and back to top to trigger lazy loading.
 */
async function scrollToTriggerLazyLoad(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const distance = 300;
      const delay = 80;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, delay);
    });
  });
  await page.waitForTimeout(400);
}

/**
 * Sanitise a page name / path into a safe filename slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
