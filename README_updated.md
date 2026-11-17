## Visual Testing

Playwright-based visual comparison and live sanity testing for Telefonica.

# VISTA - Visual Inspection and Sanity Testing Automation Framework

## Research Problem

Manual visual validation of websites and applications is time-consuming, repetitive, and prone to human errors. Traditional functional testing tools verify application behavior but often fail to detect unintended visual changes such as layout shifts, styling issues, missing UI components, and cross-browser rendering inconsistencies.

Organizations performing website migrations, redesigns, or content updates require a scalable and automated solution that can continuously validate both functionality and visual appearance across multiple environments and browsers.

VISTA addresses this challenge by providing an automated framework for visual regression testing and sanity validation using Playwright.

## Research Objectives

- Automate visual comparison between source and target environments.
- Detect UI regressions using screenshot-based analysis.
- Perform automated sanity testing across multiple browsers.
- Reduce manual testing effort and increase testing speed.
- Generate comprehensive HTML reports for easier defect analysis.
- Improve software quality through continuous validation.

## Research Contribution

- Unified framework combining Visual Regression Testing and Sanity Validation.
- Pixel-level image comparison for UI change detection.
- Multi-browser validation using Chrome, Edge, and WebKit.
- Automated HTML reporting with diagnostics and screenshots.
- Reusable and configurable architecture for large-scale website validation.

## Background and Related Work

Existing visual testing solutions such as Applitools, Percy, Selenium Visual Testing, and Playwright Snapshot Testing provide visual validation capabilities. However, many rely on paid services or offer limited customization.

VISTA provides an open-source, Playwright-based alternative with configurable validation rules, local execution, browser compatibility checks, and extensibility for enterprise testing scenarios.

## Experimental Methodology

### Test Environment

| Parameter | Value |
|-----------|-------|
| Automation Tool | Playwright |
| Language | TypeScript / JavaScript |
| Browsers | Chrome, Microsoft Edge, WebKit |
| Reporting | HTML |
| Comparison Technique | Pixel-Based Image Analysis |

### Process Flow

1. Read page configuration from Excel.
2. Capture screenshots from Source Environment.
3. Capture screenshots from Target Environment.
4. Compare screenshots pixel-by-pixel.
5. Execute sanity validation checks.
6. Generate consolidated HTML reports.

## Evaluation Metrics

- Detection Accuracy
- False Positive Rate
- Execution Time
- Browser Compatibility
- Test Coverage

## Experimental Results

The framework successfully performs automated visual regression detection, sanity validation, cross-browser testing, and report generation. Benefits include reduced manual testing effort, faster defect identification, improved repeatability, and increased software quality.

## Future Enhancements

- AI-assisted visual anomaly detection.
- Baseline version management.
- Azure DevOps and GitHub Actions CI/CD integration.
- Historical trend analytics.
- False positive reduction using machine learning.

## Conclusion

VISTA demonstrates that combining visual inspection with automated sanity validation improves software quality assurance by reducing manual effort and increasing defect detection capability.
