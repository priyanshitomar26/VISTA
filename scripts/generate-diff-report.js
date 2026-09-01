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

// Write HTML report
fs.writeFileSync(path.join(REPORT_DIR, 'index.html'), buildHTML(results));
console.log(`\nReport saved → ${path.join(REPORT_DIR, 'index.html')}`);

// ---------------------------------------------------------------------------

/**
 * @param {PNG} img
 * @param {number} w
 * @param {number} h
 * @returns {PNG}
 */
function padImage(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

/** @param {string} filePath @returns {string} */
function toDataURL(filePath) {
  const data = fs.readFileSync(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

/**
 * @param {PageResult[]} results
 * @returns {string}
 */
function buildHTML(results) {
  const passCount = results.filter(r => r.diffPct < 0.5).length;
  const failCount = results.length - passCount;
  const runDate   = new Date().toLocaleString();

  const rows = results.map(r => {
    const status = r.diffPct < 0.5 ? 'pass' : 'fail';
    return `
    <section class="card ${status}">
      <div class="card-header">
        <span class="badge ${status}">${status.toUpperCase()}</span>
        <h2>${r.viewport} / ${r.page}</h2>
        <span class="diff-pct">${r.diffPct.toFixed(3)}% diff &nbsp;(${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()} px)</span>
      </div>
      <div class="images">
        <figure>
          <figcaption>SOURCE (dev)</figcaption>
          <img src="${r.sourceSrc}" alt="source" loading="lazy">
        </figure>
        <figure>
          <figcaption>TARGET (prod)</figcaption>
          <img src="${r.targetSrc}" alt="target" loading="lazy">
        </figure>
        <figure>
          <figcaption>DIFF (highlighted)</figcaption>
          <img src="${r.diffSrc}" alt="diff" loading="lazy">
        </figure>
      </div>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDS Visual Diff Report</title>
  <style>
    :root { --pass: #22c55e; --fail: #ef4444; --bg: #0f172a; --surface: #1e293b; --text: #e2e8f0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 2rem; }
    header { margin-bottom: 2rem; }
    header h1 { font-size: 1.8rem; margin-bottom: .5rem; }
    header p  { color: #94a3b8; font-size: .9rem; }
    .summary  { display: flex; gap: 1rem; margin-bottom: 2rem; }
    .stat { background: var(--surface); border-radius: 8px; padding: 1rem 1.5rem; }
    .stat span { display: block; font-size: 2rem; font-weight: 700; }
    .stat label { font-size: .8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .pass-stat span { color: var(--pass); }
    .fail-stat span { color: var(--fail); }
    .card { background: var(--surface); border-radius: 10px; margin-bottom: 2rem; overflow: hidden;
            border-left: 4px solid var(--pass); }
    .card.fail { border-left-color: var(--fail); }
    .card-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; }
    .card-header h2 { font-size: 1rem; flex: 1; }
    .diff-pct { font-size: .85rem; color: #94a3b8; }
    .badge { padding: .2rem .6rem; border-radius: 4px; font-size: .75rem; font-weight: 700;
             background: var(--pass); color: #fff; }
    .badge.fail { background: var(--fail); }
    .images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #0f172a; }
    figure { background: var(--surface); padding: .75rem; }
    figcaption { font-size: .75rem; color: #64748b; text-transform: uppercase; letter-spacing: .08em;
                 margin-bottom: .5rem; }
    img { width: 100%; height: auto; border-radius: 4px; display: block; cursor: zoom-in; }
    img.zoomed { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: contain;
                 background: rgba(0,0,0,.9); z-index: 9999; cursor: zoom-out; border-radius: 0; }
    footer { margin-top: 3rem; color: #475569; font-size: .8rem; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>EDS Visual Diff Report</h1>
    <p>SOURCE: <strong>www.google.com</strong> &nbsp;→&nbsp; TARGET: <strong>www.amazon.in</strong></p>
    <p>Generated: ${runDate}</p>
  </header>

  <div class="summary">
    <div class="stat pass-stat"><span>${passCount}</span><label>Passed</label></div>
    <div class="stat fail-stat"><span>${failCount}</span><label>Failed</label></div>
    <div class="stat"><span>${results.length}</span><label>Total Pages</label></div>
  </div>

  ${rows}

  <footer>Pixel diff threshold: ${(THRESHOLD * 100).toFixed(0)}% per pixel &nbsp;|&nbsp; Pass threshold: &lt;0.5% changed pixels</footer>

  <script>
    document.querySelectorAll('.images img').forEach(img => {
      img.addEventListener('click', () => img.classList.toggle('zoomed'));
    });
  </script>
</body>
</html>`;
}
