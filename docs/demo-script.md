# 10-minute demo recording guide

Record one continuous screen recording, maximum 10 minutes. Keep the browser on the deployed public app for Part 1, then switch to the repository/terminal for Part 2. Do not claim live data has been validated unless you have verified the deployed API response first.

## Part 1 — Client pitch (target 4:30)

**0:00–0:35 | Problem and purpose**
“Day-ahead wind is uncertain, and a procurement decision is only as useful as the forecast available at the time the decision is made. This pilot brings the national wind forecast and subsequent outturn into one auditable view, so the team can understand forecast uncertainty rather than treating a forecast as a guaranteed volume.”

**0:35–1:25 | Decision-time snapshot**
Show the month selector and the decision-time banner. Explain that the pilot chooses the latest forecast published by 11:00 UK time on the previous day for each delivery interval. Explicitly call this a configurable assumption to be confirmed with the trading desk.

**1:25–2:20 | Generation profile**
Walk through the actual-versus-forecast chart. Point out where the lines diverge and explain that wind forecast error can change the residual volume that must be procured from other sources. Do not imply the app calculates residual demand: demand data is intentionally out of scope.

**2:20–3:20 | Accuracy measures**
Explain MAE as typical absolute miss, RMSE as more sensitive to large errors, and signed bias as systematic over- or under-forecasting. Mention interval coverage so users can see whether the metrics are based on a complete match. Explain why MAPE is secondary when actual wind output approaches zero.

**3:20–4:10 | Auditability and export**
Show the decision log: delivery time, forecast publication time, forecast, actual, and error. Export CSV and describe how analysts can use interval-level records for further review.

**4:10–4:30 | Close**
“This is a transparent pilot, not an automated trading recommendation. The next validation step is to agree the official cutoff, verify historical forecast availability and API coverage with the desk, and then run the figures against a trading-reviewed sample.”

## Part 2 — Technical review / knowledge transfer (target 4:45)

**0:00–0:45 | Architecture**
Show the repo tree. React + Vite renders the dashboard; FastAPI retrieves Elexon data, selects forecasts, joins to actuals, and calculates metrics; Docker Compose runs both containers. No database is used in this first version.

**0:45–1:45 | Data flow and key logic**
Open `backend/app/main.py`. Explain bounded retrieval for FUELHH and WINDFOR, WIND filtering on actuals, timestamp normalization, delivery-month filtering, and the join on `startTime`. Highlight `decision_cutoff()` and the filter `publishTime <= cutoffTime`; selecting the latest eligible publication prevents look-ahead bias.

**1:45–2:40 | Metrics**
Explain `errorMW = forecastMW - actualMW`, MAE, RMSE, bias, MAPE, and coverage. Note that positive error means the forecast exceeded actual wind outturn. Missing forecast matches are not imputed as zero. Discuss MAPE's near-zero limitation.

**2:40–3:35 | Frontend and API**
Show `frontend/src/main.jsx`: dashboard state, API request, charting, metrics, error state, and CSV export. Show `/api/health`, `/api/analysis?month=2026-01`, and `/docs` once the backend is running.

**3:35–4:20 | Containerization and practices**
Show the two Dockerfiles and `docker-compose.yml`. Mention environment configuration for API root/CORS and the Vite API URL. Explain the README documents assumptions and known limitations. In a production follow-up, add automated tests, caching, retry/backoff, pagination, schema checks, logging, and CI.

**4:20–4:45 | Known limitations and next steps**
Be candid: confirm the Elexon query/filter behavior and historical forecast endpoint semantics with live responses; verify complete January coverage; confirm the trading cutoff with the client. The app currently uses only national wind actuals/forecasts, so it does not calculate net demand or a procurement quantity.
