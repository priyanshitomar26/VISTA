# EDS Repository Setup

This guide connects pull requests in `Mobility-Global/mobility-global-eds` to the QA automation in `Mobility-Global/mobility-global-qa`.

## What The QA Workflow Does

The reusable workflow is stored in:

```text
.github/workflows/qa-checks.yml
```

It runs:

- `npm run sanity`
- `npm run diff`
- Sanity and visual report generation
- Report artifact upload, including reports from failed checks

It supports pull requests targeting `Develop`, `Stage`, or `main`.

## EDS Caller Workflow

After the QA workflow has been merged into the QA repository's `main` branch, create this file in the EDS repository:

```text
.github/workflows/qa-checks.yml
```

Use this content:

```yaml
name: QA checks

on:
  pull_request:
    branches: [Develop, Stage, main]
  workflow_dispatch:

jobs:
  qa:
    uses: Mobility-Global/mobility-global-qa/.github/workflows/qa-checks.yml@main
    with:
      qa_ref: main
    secrets: inherit
```

This caller workflow receives the pull request event in the EDS repository and invokes the reusable workflow from the QA repository.

## Repository Secret

If `mobility-global-qa` is private, add this repository secret in `mobility-global-eds`:

```text
QA_REPO_TOKEN
```

The token must have read access to the QA repository. A classic personal access token or fine-grained token can be used according to the organization's security policy. If the QA repository is public, this secret may not be required.

The caller uses `secrets: inherit`, which passes the secret to the reusable QA workflow.

## First Test

1. Push the QA workflow to `Mobility-Global/mobility-global-qa`.
2. Merge the QA workflow into the QA repository's `main` branch.
3. Add the caller workflow to `Mobility-Global/mobility-global-eds`.
4. Add `QA_REPO_TOKEN` to the EDS repository if QA is private.
5. Open a test PR in EDS targeting `Develop`, `Stage`, or `main`.
6. Open the **Actions** tab in EDS and inspect the `QA checks` run.
7. Download the `sanity-report` and `visual-report` artifacts from the completed run.

## Preview URL Requirement

The current sanity URLs and visual comparison pages are configured in the QA repository:

- `config/sanity-urls.json`
- `config/pages.xlsx`

They currently test the configured live URLs. To test the actual EDS pull request code, the EDS pipeline must first deploy the PR to a reachable preview URL. Then update the QA configuration, or provide a workflow-specific configuration, so the checks target that preview URL.

## Branch Reference During Initial Setup

If the QA workflow is still only on a setup branch, temporarily change both references in the EDS caller:

```yaml
uses: Mobility-Global/mobility-global-qa/.github/workflows/qa-checks.yml@workflow-setup
```

```yaml
qa_ref: workflow-setup
```

After merging the QA workflow to `main`, change both values back to `main`.

## Reports In GitHub Actions

GitHub Actions does not open a browser window on your computer. The workflow uploads the generated reports as artifacts:

- `sanity-report`
- `visual-report`

Download the artifact from the completed workflow run to inspect the HTML report locally.
