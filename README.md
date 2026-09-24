# EDS Visual Testing

Playwright-based visual comparison and live sanity testing for Mobility Global pages.

## Quick Start

```bash
npm install
npx playwright install chromium webkit
```

Chrome and Microsoft Edge must also be installed locally. The Safari check uses Playwright WebKit, which is the cross-platform Safari engine.

## Project Structure

```text
config/
  pages.xlsx              Visual comparison page configuration
  sanity-urls.json        Editable live URLs for sanity checks
  pages.config.ts         TypeScript visual-test configuration
  pages.config.js         CommonJS visual-script configuration
report-assets/
  styles.css              Shared report styling
scripts/
  run-sanity.js           Runs sanity tests and opens the sanity report
  sanity-report-builder.js Builds the sanity HTML report
  run-visual-diff.js      Captures, compares, and opens the visual report
  report-builder.js       Builds the visual comparison report
  capture-screenshots.js  Captures source/target screenshots
  generate-diff-report.js Builds a report from existing screenshots
tests/
  sanity.spec.ts          Live URL checks
  visual/                 Visual regression tests
  capture/                Screenshot capture tests
utils/
  page-helpers.ts         Navigation and page-state helpers
  image-diff.ts           Pixel comparison helper
```

## Sanity Automation

Edit [config/sanity-urls.json](config/sanity-urls.json) to add, remove, or rename URLs. The URL is the source of the displayed page name: `/` becomes `Home`, `/about-us` becomes `About Us`, and so on.

Run the checks with:

```bash
npm run sanity
```

The command runs every configured URL on three desktop browser projects:

- Chrome
- Microsoft Edge
- Safari engine via Playwright WebKit

The report opens automatically at `sanity-report/index.html`. Each page is shown as one expandable result. The sidebar search accepts either the page name or URL.

The report counts checks across all browser projects, while `Pages` counts unique URLs. Each URL runs six checks: page load and HTTP status, header, footer, logo navigation, console errors, and search. The Home URL also runs an Open Graph metadata check. For example, five configured URLs produce `(4 x 6 + 1 x 7) x 3 = 93` total checks across Chrome, Edge, and WebKit.

Checks include:

- Page loads successfully
- HTTP status code
- Header visibility
- Footer presence
- Header logo navigation to Home
- Critical console errors
- Search functionality
- Home page Open Graph metadata

Expanded page details also show page speed, page title, page description, overall pass/fail status, and the percentage of checks passed. Page title is read from `meta property="og:title"`. Page description is read from `meta name="description"`, with Open Graph fallback support.

The command returns a non-zero exit code when any browser check fails, but still generates the HTML report with failure details.

## Pull Request Checks

The workflow is in `.github/workflows/qa-checks.yml`. It runs locally for QA-repository pull requests targeting:

- `Develop`
- `Stage`
- `main`

It also supports manual runs and reusable calls from another repository. The complete EDS repository setup, caller workflow, secret configuration, branch migration notes, and preview URL guidance are documented in [EDS-SETUP.md](EDS-SETUP.md).

## Visual Comparison

Visual comparison uses the pages in `config/pages.xlsx`. Each row contains a source URL, target URL, page name, and optional capture settings.

Run the complete visual workflow with:

```bash
npm run diff
```

This captures source and target screenshots for desktop and mobile, computes pixel differences, and opens `diff-report/index.html`.

Related commands:

```bash
npm run capture:source   # Capture source screenshots
npm run capture:target   # Capture target screenshots
npm run capture:all      # Capture both environments
npm run diff:report      # Build a report from existing screenshots
npm run diff:desktop     # Run visual diff for desktop only
npm run diff:mobile      # Run visual diff for mobile only
```

The visual report shows source, target, and diff images with page URLs, viewport grouping, pass/fail status, and page search.

## Visual Page Configuration

Create the workbook if it does not exist:

```bash
npm run config:init
```

Regenerate the default workbook:

```bash
npm run config:reset
```

The `Pages` sheet supports these columns:

| Column | Description |
| --- | --- |
| `S No.` | Display/order number |
| `SOURCE_BASE_URL` | Source URL |
| `TARGET_BASE_URL` | Target URL |
| `Page Name` | Report name |
| `fullPage` | Capture the full page, default `TRUE` |
| `waitForSelector` | Optional selector to wait for |
| `waitMs` | Additional wait time in milliseconds |
| `skip` | Exclude the row when `TRUE` |
| `maskSelectors` | Comma-separated dynamic-element selectors |

## Other Commands

```bash
npm test                 # Run configured Playwright tests
npm run test:headed      # Run tests in headed mode
npm run test:ui          # Open Playwright UI mode
npm run report           # Open the Playwright HTML report
npm run clean            # Remove generated reports and screenshots
```

## Browser Projects

The Playwright projects are defined in [playwright.config.ts](playwright.config.ts):

- `chrome-desktop` uses the installed Chrome channel
- `edge-desktop` uses the installed Microsoft Edge channel
- `safari-desktop` uses Playwright WebKit

The sanity runner uses all three projects. Visual tests can target a project explicitly:

```bash
npx playwright test tests/visual/eds-visual.spec.ts --project=chrome-desktop
```

## Thresholds

- Visual pixel tolerance is configured in `scripts/generate-diff-report.js`.
- Playwright screenshot tolerance is configured in `playwright.config.ts`.
- Sanity checks fail the overall page when any individual check fails.

Generated folders such as `sanity-report`, `diff-report`, `playwright-report`, `screenshots`, and `test-results` are removed by `npm run clean`.
