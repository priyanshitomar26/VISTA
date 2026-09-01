EDS Visual Testing : This code based is for Playwright-based visual regression suite that compares every configured EDS page on the **SOURCE** (dev) environment against the **TARGET** (production) environment.

---

## Project Structure

```
├── config/
│   ├── pages.config.ts          # TypeScript page list (used by Playwright tests)
│   └── pages.config.js          # CommonJS mirror (used by Node.js scripts)
├── report-assets/
│   └── styles.css               # External CSS for the HTML diff report
├── scripts/
│   ├── run-visual-diff.js       # All-in-one: capture → diff → open report
│   ├── report-builder.js        # Shared HTML report builder (used by scripts above)
│   ├── capture-screenshots.js   # Standalone screenshot capture only
│   └── generate-diff-report.js  # Diff + HTML report generation only
├── tests/
│   ├── visual/
│   │   └── eds-visual.spec.ts   # Playwright visual regression tests
│   └── capture/
│       └── capture.spec.ts      # Screenshot capture via Playwright test runner
├── utils/
│   ├── page-helpers.ts          # Navigation, lazy-load, animation helpers
│   └── image-diff.ts            # pixelmatch wrapper
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## Quick Start

### 1. Install

```bash
npm install
npx playwright install chromium firefox
```

### 2. Workflow A — Playwright Visual Regression (recommended)

This uses Playwright's built-in snapshot comparison.

```bash
# First run: captures TARGET as the baseline
npx playwright test tests/visual/eds-visual.spec.ts --project=chromium-desktop

# Subsequent runs: SOURCE is compared against the saved TARGET baseline
npx playwright test tests/visual/eds-visual.spec.ts

# Update baselines after intentional changes
npx playwright test tests/visual/eds-visual.spec.ts --update-snapshots

# Open the HTML report
npm run report
```

### 3. Workflow B — Side-by-Side Diff Report

Captures screenshots with Node.js and generates a standalone HTML report.

```bash
# Step 1: Capture screenshots (both envs, all viewports)
npm run capture:all

# Step 2: Generate HTML diff report
npm run diff:report

# Open diff-report/index.html in your browser
```

You can also capture individual environments:

```bash
npm run capture:source   # SOURCE only
npm run capture:target   # TARGET only
```

---

## Adding / Removing Pages

Edit `config/pages.config.ts` (and its `config/pages.config.js` mirror):

```ts
{ name: 'Blog', path: '/blog', fullPage: true, waitForSelector: 'main' },
```

Set `skip: true` to temporarily exclude a page without deleting it.

---

## Configuration

| File | What to change |
|---|---|
| `config/pages.config.ts` | Add/remove pages, adjust selectors, mask dynamic elements |
| `playwright.config.ts` | Diff threshold (`maxDiffPixelRatio`), viewports, browsers |
| `scripts/generate-diff-report.js` | `THRESHOLD` constant (per-pixel colour tolerance) |

---

## Diff Thresholds

- **`threshold`** (pixelmatch) — per-pixel colour tolerance `0`–`1`. Default: `0.1`  
- **`maxDiffPixelRatio`** (Playwright) — max fraction of changed pixels before a test fails. Default: `0.05` (5%)  

Lower values = stricter comparison.

---

## CI Integration

```yaml
# .github/workflows/visual.yml (example)
- name: Install dependencies
  run: npm ci && npx playwright install --with-deps chromium

- name: Run visual tests
  run: npx playwright test tests/visual/eds-visual.spec.ts --project=chromium-desktop

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```
