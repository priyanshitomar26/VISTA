#!/usr/bin/env node
/**
 * generate-diff-report.js
 *
 * Reads screenshots from the `screenshots/` folder (produced by capture-screenshots.js),
 * computes pixel-level diffs using pixelmatch, and writes a self-contained HTML report
 * to `diff-report/index.html`.
 *
 * Usage:
 *   node scripts/generate-diff-report.js
 */

// @ts-check
const fs   = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { buildReport } = require('./report-builder');
const { SOURCE_BASE_URL, TARGET_BASE_URL } = require('../config/pages.config.js');

const SCREENSHOT_DIR = path.resolve('screenshots');
const REPORT_DIR     = path.resolve('diff-report');
const THRESHOLD      = 0.1; // per-pixel colour tolerance

fs.mkdirSync(REPORT_DIR, { recursive: true });

/**
 * @typedef {{ page: string, viewport: string, diffPixels: number,
 *             totalPixels: number, diffPct: number,
 *             sourceSrc: string, targetSrc: string, diffSrc: string }} PageResult
 */

/** @type {PageResult[]} */
const results = [];

// Iterate viewports (desktop / mobile / …)
const viewportDirs = fs.readdirSync(SCREENSHOT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const viewport of viewportDirs) {
  const vpDir = path.join(SCREENSHOT_DIR, viewport);
  const pageDirs = fs.readdirSync(vpDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const slug of pageDirs) {
    const dir = path.join(vpDir, slug);
    const sourcePath = path.join(dir, 'source.png');
    const targetPath = path.join(dir, 'target.png');
    const diffPath   = path.join(dir, 'diff.png');

    if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
      console.warn(`  [SKIP] Missing source or target for ${viewport}/${slug}`);
      continue;
    }

    const sourceImg = PNG.sync.read(fs.readFileSync(sourcePath));
    const targetImg = PNG.sync.read(fs.readFileSync(targetPath));

    const width  = Math.max(sourceImg.width, targetImg.width);
    const height = Math.max(sourceImg.height, targetImg.height);

    const sPadded = padImage(sourceImg, width, height);
    const tPadded = padImage(targetImg, width, height);
    const diff    = new PNG({ width, height });

    const diffPixels = pixelmatch(sPadded.data, tPadded.data, diff.data, width, height, {
      threshold: THRESHOLD,
      includeAA: false,
    });

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const diffPct     = (diffPixels / totalPixels) * 100;

    results.push({
      page:        slug,
      viewport,
      diffPixels,
      totalPixels,
      diffPct,
      sourceSrc:   toDataURL(sourcePath),
      targetSrc:   toDataURL(targetPath),
      diffSrc:     toDataURL(diffPath),
    });

    const status = diffPct < 0.5 ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${viewport}/${slug} — ${diffPct.toFixed(2)}% diff (${diffPixels} px)`);
  }
}

// Write HTML report + styles.css
const reportPath = buildReport(results, SOURCE_BASE_URL, TARGET_BASE_URL, REPORT_DIR);
console.log(`\nReport saved → ${reportPath}`);

// ---------------------------------------------------------------------------

function padImage(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

function toDataURL(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

