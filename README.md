# WindTrade Analytics

A small full-stack pilot that helps a UK electricity utility compare national wind generation forecasts with actual generation. It uses only Elexon BMRS `FUELHH` and `WINDFOR` data.

The project is intentionally kept simple: one FastAPI file for the API and one React file for the dashboard. The helper functions have descriptive names so the data flow is easy to follow and explain.

## What it does

- Shows half-hourly wind generation actuals and forecasts for a selected month (January 2026 by default).
- Shows MAE, RMSE, forecast bias, MAPE, and forecast coverage.
- Shows when a forecast was published and the matching delivery interval.
- Exports the monthly records as CSV.
- Runs locally with Docker Compose or with Python and Node.js separately.

## Key business rule

The dashboard uses the latest forecast published by **11:00 UK time on the day before delivery**. This is an explicit pilot assumption because the brief does not provide the team's exact trading cutoff. Confirm it with the client before operational use. A forecast published after the cutoff must not be used to score what the team could have known when making its decision.

`errorMW = forecastMW - actualMW`. Positive bias means the forecast was higher than the actual wind generation. Forecast coverage is shown so missing forecasts are not treated as zero generation. MAPE is included as a secondary metric because percentage errors can become misleading when actual generation is near zero.

## Project structure

```text
windtrade-analytics/
├── backend/
│   ├── app/main.py       # API, Elexon download, matching and metrics
│   ├── requirements.txt  # Python packages
│   └── Dockerfile        # Backend container
├── frontend/
│   ├── src/main.jsx      # React dashboard and chart
│   ├── src/styles.css    # Dashboard styling
│   ├── index.html        # Web page entry point
│   ├── package.json      # Frontend packages and commands
│   ├── vite.config.js    # Local development server and API proxy
│   ├── Dockerfile        # Build and serve the frontend
│   └── nginx.conf        # Route API calls to the backend in Docker
├── docs/
│   └── demo-script.md    # Customer and technical video outline
└── docker-compose.yml    # Runs both services together
```

## Run with Docker

Install Docker Desktop, then run this command from the project root:

```bash
docker compose up --build
```

Open the dashboard at <http://localhost:5173>. The API health check is <http://localhost:8000/api/health>, and interactive API documentation is at <http://localhost:8000/docs>.

Stop the app with `Ctrl+C`, then run `docker compose down` if needed.

## Run without Docker

Requirements: Python 3.11 or newer and Node.js 20 or newer.

**Terminal 1 — backend**

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to the backend on port 8000.

## API endpoint

`GET /api/analysis?month=2026-01` returns summary metrics and half-hourly records. The month can be changed using the dashboard's month picker.

## Data sources

- Actual generation: [Elexon FUELHH stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to `fuelType = WIND`.
- Forecast generation: [Elexon WINDFOR stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream), using `publishTime` to select the latest forecast available before the assumed cutoff.

## Deployment checklist

The app has **not yet been deployed**. Do not submit a made-up live URL.

For a straightforward deployment, host the Python backend as a web service (for example, Render) and the React frontend on Vercel. Set `VITE_API_URL` to the deployed backend URL when building the frontend, and set the backend's `CORS_ORIGINS` to the deployed frontend URL. Then verify the dashboard, `/api/health`, and `/api/analysis?month=2026-01` in a private/incognito window.

Add the public GitHub repository URL and deployed app URL here after publishing and testing them.

## Before submission

- [ ] Test the API against real January 2026 responses and confirm Elexon's date-filter behavior and historical forecast coverage.
- [ ] Check that the API returns enough records for the full month; if the endpoint paginates or caps results, add pagination before relying on the metrics.
- [ ] Confirm the actual trading cutoff with the client.
- [ ] Deploy the app and verify it in a private/incognito window.
- [ ] Record and upload the two-part video (maximum 10 minutes) using `docs/demo-script.md`.
- [ ] Put the public repository, live app, and unlisted video links into the submission form.

## AI tools

OpenAI ChatGPT was used to help scaffold and revise the application and documentation. The code and analytical assumptions must be reviewed and the live Elexon results validated before the application is used for business decisions.

## Scope and limitations

This is a decision-support pilot, not an automated trading system. It uses only national wind actuals and forecasts, as requested. It does not estimate consumer demand, wholesale prices, thermal plant availability, or the amount of electricity that must be procured. The forecast cutoff is an assumption and live API behavior still needs validation.
