**EDS Visual Testing** : This code based is for Playwright-based visual regression suite that compares every configured EDS page on the **SOURCE** (dev) environment against the **TARGET** (production) environment.

---

## Project Structure

```
├── config/
│   ├── pages.xlsx               # SOURCE/TARGET URLs + page list (edit this)
│   ├── excel-loader.js          # Reads pages.xlsx
│   ├── pages.config.ts          # TypeScript entry (used by Playwright tests)
│   └── pages.config.js          # CommonJS entry (used by Node.js scripts)
├── report-assets/
│   └── styles.css               # External CSS for the HTML diff report
├── scripts/
│   ├── generate-pages-excel.js  # Creates config/pages.xlsx template
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
npm run config:init   # creates config/pages.xlsx if missing
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

Or run capture + diff + open report in one step:

```bash
npm run diff             # all viewports
npm run diff:desktop     # desktop only
npm run diff:mobile      # mobile only
```

### Reading the diff report

- Cards appear in the same order as the **S No.** rows in `pages.xlsx`, grouped by viewport.
- Each card shows the exact SOURCE and TARGET URL that was captured for that row.
- The sidebar groups results by viewport and starts collapsed — click **Desktop** / **Mobile** to expand, or type in the search box to auto-expand matches.
- Rows removed from `pages.xlsx` are ignored even if their old screenshots are still on disk. Run `npm run clean` to remove them.
- Every run overwrites `diff-report/index.html` and the PNGs under `screenshots/` — no history is kept.

---

## Adding / Removing Pages

Open `config/pages.xlsx` (sheet **Pages**) and add a row — one row = one comparison:

| S No. | SOURCE_BASE_URL | TARGET_BASE_URL | Page Name | fullPage | waitForSelector | waitMs | skip | maskSelectors |
|---|---|---|---|---|---|---|---|---|
| 1 | https://www.google.com | https://www.amazon.in | Home | TRUE | body | | FALSE | |
| 2 | https://certification.adobe.com/courses | https://certification.adobe.com/courses/1064 | Course Page | TRUE | body | | FALSE | .ad-slot, .carousel |

- `SOURCE_BASE_URL` / `TARGET_BASE_URL` are the **full URLs** to compare — they can point at different sites entirely.
- If a row leaves a URL blank, the first row's URL is used. An optional `path` column is appended to the URL when present.
- `fullPage` / `skip` accept `TRUE`/`FALSE` (defaults: `fullPage` TRUE, `skip` FALSE).
- `maskSelectors` is a comma-separated list of CSS selectors.
- Set `skip` to `TRUE` to temporarily exclude a row without deleting it.

Just save the workbook and re-run any command — no code changes needed. Run `npm run config:reset` to regenerate the workbook from defaults (overwrites it).

---

## Configuration

| File | What to change |
|---|---|
| `config/pages.xlsx` | SOURCE/TARGET URLs, add/remove pages, selectors, masked elements |
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
