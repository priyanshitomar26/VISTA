import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  PAGES,
  SOURCE_BASE_URL,
  TARGET_BASE_URL,
  PageConfig,
} from '../../config/pages.config';
import { navigateAndWait, buildMasks, slugify } from '../../utils/page-helpers';

/**
 * Visual regression tests — SOURCE (dev) vs TARGET (production).
 *
 * Strategy:
 *   1. Capture a baseline screenshot of the TARGET page.
 *   2. Capture a screenshot of the SOURCE page.
 *   3. Compare the SOURCE screenshot against the TARGET baseline using
 *      Playwright's built-in `toHaveScreenshot` with the configured threshold.
 *
 * On the first run the TARGET snapshot is saved as the baseline.
 * Re-run with `--update-snapshots` to refresh baselines after intentional changes.
 */

for (const pageConfig of PAGES) {
  if (pageConfig.skip) continue;

  test.describe(`Visual: ${pageConfig.name}`, () => {
    // ------------------------------------------------------------------ TARGET
    test(`TARGET baseline — ${pageConfig.name} [${pageConfig.path}]`, async ({ page }, testInfo) => {
      const url = `${TARGET_BASE_URL}${pageConfig.path}`;
      await navigateAndWait(page, url, pageConfig);

      const masks = buildMasks(page, pageConfig.maskSelectors);
      const snapshotName = `${slugify(pageConfig.name)}-target.png`;

      await expect(page).toHaveScreenshot(snapshotName, {
        fullPage: pageConfig.fullPage ?? true,
        mask: masks,
        animations: 'disabled',
      });
    });

    // ------------------------------------------------------------------ SOURCE
    test(`SOURCE vs TARGET — ${pageConfig.name} [${pageConfig.path}]`, async ({ page }, testInfo) => {
      const url = `${SOURCE_BASE_URL}${pageConfig.path}`;
      await navigateAndWait(page, url, pageConfig);

      const masks = buildMasks(page, pageConfig.maskSelectors);
      // Compare SOURCE screenshot against the TARGET baseline snapshot
      const snapshotName = `${slugify(pageConfig.name)}-target.png`;

      await expect(page).toHaveScreenshot(snapshotName, {
        fullPage: pageConfig.fullPage ?? true,
        mask: masks,
        animations: 'disabled',
      });
    });
  });
}
