# Crypto Observatory

A mobile-friendly dashboard for BTC, ETH, SOL, SUI and XRP. Static HTML/CSS/JavaScript with a Python daily collector and GitHub Pages workflow. No wallet connection, backend, npm installation or secrets required for public data.

## Open the included preview

Extract the ZIP and open `Preview.html` in your browser. It contains the collected snapshot and all styling; it works offline. Its reload button reloads the same embedded snapshot. Publish the `site` folder through the workflow for daily updates.

Validation: calculation tests and snapshot checks passed. Browser screenshot QA could not run in the build environment because the browser download failed.

## Publish on GitHub

1. Create a repository named `crypto-observatory` on your GitHub account. A public repository works with free GitHub Pages; private-repository Pages availability depends on your plan. The website itself is public under the standard Pages setup.
2. Upload this project's contents, **including `.github/workflows/pages.yml`**, keeping the folder structure. Or push using Git (below).
3. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. In **Actions → Refresh data and publish dashboard**, select **Run workflow**. The finished run shows the website address.

```sh
git init -b main
git add .
git commit -m "Build crypto fundamentals dashboard"
git remote add origin https://github.com/YOUR-USERNAME/crypto-observatory.git
git push -u origin main
```

The workflow runs daily at approximately 07:23 UTC. GitHub schedules can be delayed, and scheduled workflows in inactive public repositories may be disabled after 60 days. You can run it manually anytime. Reload data in the dashboard reloads the published snapshot; it does not invoke the collector.

## Run locally

Requires Python 3.12+ and Node 22+ for calculation tests.

```sh
python scripts/update_data.py
node --test tests/math.test.mjs
python -m http.server 8000 --directory site
```

Visit http://localhost:8000. A source snapshot is included so you can preview without fetching first. Do not double-click index.html; browser fetch policies require HTTP.

## What is included

- Coin selector; network usage and store-of-value views; 90-day, 1-year and 5-year chart windows.
- Prices for five assets and available daily active addresses/transactions via Coin Metrics.
- Ethereum, Solana and Sui DEX volume and TVL via DefiLlama; public chain-fee history where available.
- Realised capitalisation where available, with same-provider market-cap/MVRV derivation as a fallback.
- BTC supply unmoved for one year if supply-age data is available. This is NOT the Glassnode 155-day entity-adjusted LTH metric.
- Nominal rolling one-year USD return and drawdown within the loaded price history. Neither is inflation-adjusted. The drawdown baseline is at most five years, not guaranteed all-time high.
- 30/90-day changes use exact calendar dates. Percentage indicators use percentage-point changes. Missing dates yield no comparison, not an approximation. Counts/flows compare individual daily observations, so they can be noisy.
- Collection and observation timestamps; stale labels; explicit unavailable states. No fabricated/demo values, buy/sell signals or opaque valuation scores.

## Coverage limitations

Public API availability differs by asset and may change. Several Coin Metrics metrics return restricted/unavailable responses. The current dashboard does not claim complete holder coverage: an unavailable card is an intentional data gap, not a zero. SOL/SUI active addresses may be unavailable. Ethereum data is mainnet-only; XRP totals are not exclusively payments. There is no bot-filtered net usage measure, stablecoin history, CPI adjustment or verified token-demand attribution in this version.

Coin Metrics licensed access can be supplied as repository Actions secret `COINMETRICS_API_KEY` (workflow already references it). This enables only metrics included in your subscription; do not assume it supports all assets. Never put keys in site files or paste them in chat. Non-BTC long-term-holder share is not implemented; it needs an appropriate provider and methodology rather than a copied BTC threshold.

The collector independently fetches metrics, omits incomplete current-day observations and retains prior successful series if refreshes fail. GitHub Actions cache preserves the last good published snapshot across runs while available. A run with zero successful series fails and leaves the existing site deployment unchanged. Cache eviction can revert fallback history to the committed snapshot. No automatic commits are made.

## Sources and definitions

- https://docs.coinmetrics.io/api/v4/
- https://docs.coinmetrics.io/network-data/network-data-overview/supply
- https://github.com/coinmetrics/docs-website/blob/master/asset-metrics/market/capmvrvcur.md
- https://defillama.com/docs/api
- https://defillama.com/data-definitions

Public data usage remains subject to the providers' terms. Price history, network activity and inactivity do not establish future purchasing-power preservation. No personal holdings or quantities are stored.
