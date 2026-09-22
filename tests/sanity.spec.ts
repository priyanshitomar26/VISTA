import { test, expect, type Locator, type Page } from '@playwright/test';
import sanityUrls from '../config/sanity-urls.json';

interface SanityPage {
  name: string;
  url: string;
  isHome?: boolean;
  headerSelector?: string;
  footerSelector?: string;
  logoSelector?: string;
  searchSelector?: string;
}

const pages = sanityUrls as SanityPage[];
const HOME_URL = pages.find((page) => page.isHome)?.url ?? pages[0]?.url;
const SEARCH_TERM = 'mobility';

const firstVisible = async (locators: Locator[]): Promise<Locator | undefined> => {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) {
      return locator.first();
    }
  }
  return undefined;
};

async function findSearchControl(page: Page, selector?: string): Promise<Locator | undefined> {
  if (selector) {
    return firstVisible([page.locator(selector)]);
  }

  const searchPageInput = page.locator('input.search-input');
  if (await searchPageInput.count()) {
    await searchPageInput.first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    await searchPageInput.first().scrollIntoViewIfNeeded();
    return (await searchPageInput.first().isVisible().catch(() => false))
      ? searchPageInput.first()
      : undefined;
  }

  const searchInput = await firstVisible([
    page.locator('input[type="search"]'),
    page.locator('input[name*="search" i]'),
    page.locator('input[placeholder*="search" i]'),
    page.locator('[role="search"] input'),
  ]);
  if (searchInput) return searchInput;

  const searchTrigger = await firstVisible([
    page.getByRole('button', { name: /search/i }),
    page.getByRole('link', { name: /search/i }),
  ]);
  if (searchTrigger) {
    await searchTrigger.click();
    await page.waitForURL(/\/search(?:\?|$)/);
    const input = page.locator('input.search-input').first();
    await input.waitFor({ state: 'attached' });
    await input.scrollIntoViewIfNeeded();
    return input;
  }

  await page.waitForTimeout(1_500);
  const delayedSearchTrigger = await firstVisible([
    page.getByRole('button', { name: /search/i }),
    page.getByRole('link', { name: /search/i }),
  ]);
  if (delayedSearchTrigger) {
    await delayedSearchTrigger.click();
    await page.waitForURL(/\/search(?:\?|$)/);
    const input = page.locator('input.search-input').first();
    await input.waitFor({ state: 'attached', timeout: 5_000 });
    await input.scrollIntoViewIfNeeded();
    return input;
  }

  return undefined;
}

for (const pageConfig of pages) {
  test.describe(`Sanity: ${pageConfig.name}`, () => {
    test.describe.configure({ mode: 'parallel' });

    test(`page loads and returns a successful status — ${pageConfig.url}`, async ({ page }) => {
      const response = await page.goto(pageConfig.url, { waitUntil: 'load' });
      expect(response, 'The URL should return an HTTP response').toBeTruthy();
      expect(response?.status(), 'The page should return a successful HTTP status').toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');
    });

    test(`header is visible — ${pageConfig.url}`, async ({ page }) => {
      await page.goto(pageConfig.url, { waitUntil: 'load' });
      await expect(page.locator(pageConfig.headerSelector ?? 'header').first()).toBeVisible();
    });

    test(`footer is visible — ${pageConfig.url}`, async ({ page }) => {
      await page.goto(pageConfig.url, { waitUntil: 'load' });
      const footer = page.locator(
        pageConfig.footerSelector ??
          'footer.footer-wrapper, footer.footer-wrapper > .footer.block[data-block-name="footer"]',
      ).first();
      await page.waitForTimeout(2_000);
      await page.evaluate(async () => {
        for (let index = 0; index < 30; index += 1) {
          window.scrollBy(0, 500);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      });
      await expect(footer).toBeAttached({ timeout: 20_000 });
    });

    test(`header logo links to home — ${pageConfig.url}`, async ({ page }) => {
      await page.goto(pageConfig.url, { waitUntil: 'load' });
      const logo = pageConfig.logoSelector
        ? page.locator(pageConfig.logoSelector).first()
        : page.locator('header a:has(img), header a[aria-label*="home" i], header a[title*="home" i]').first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('href', /.+/);
      await logo.click({ force: true });
      await expect(page).toHaveURL(new URL(HOME_URL).toString());
    });

    test(`has no critical console errors — ${pageConfig.url}`, async ({ page }) => {
      const criticalErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !/favicon|analytics|gtm|google/i.test(message.text())) {
          criticalErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => criticalErrors.push(error.message));
      await page.goto(pageConfig.url, { waitUntil: 'load' });
      expect(criticalErrors, 'Critical browser errors were reported').toEqual([]);
    });

    test(`search works — ${pageConfig.url}`, async ({ page }) => {
      await page.goto(pageConfig.url, { waitUntil: 'load' });
      const search = await findSearchControl(page, pageConfig.searchSelector);
      expect(search, 'A visible search control should be available').toBeTruthy();
      await search!.fill(SEARCH_TERM);
      await search!.press('Enter');
      await expect.poll(async () => page.url()).not.toBe(pageConfig.url);
      await expect(page.locator('body')).toContainText(new RegExp(SEARCH_TERM, 'i'));
    });

    if (pageConfig.isHome) {
      test(`home page has required Open Graph metadata — ${pageConfig.url}`, async ({ page }) => {
        await page.goto(pageConfig.url, { waitUntil: 'load' });
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
        await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
      });
    }
  });
}