# WindTrade Analytics

A simple full-stack dashboard for comparing UK national wind generation forecasts with actual generation using Elexon BMRS data.

## Features

- January 2026 wind generation dashboard
- Hourly actual vs forecast comparison
- Forecast accuracy metrics: MAE, RMSE, bias and MAPE
- Forecast coverage and publication time
- CSV export

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Python, FastAPI
- **Data:** Elexon BMRS (`FUELHH`, `WINDFOR`)
- **Deployment:** Docker; planned hosting on Vercel and a Python web service

## Project Structure

```text
backend/
  app/main.py
  requirements.txt
  Dockerfile
frontend/
  src/main.jsx
  src/styles.css
  package.json
  Dockerfile
docs/
  demo-script.md
docker-compose.yml
README.md
```

## Run Locally

Install Docker Desktop, then run from the project root:

```bash
docker compose up --build
```

Open the dashboard at http://localhost:5173.

API health check: http://localhost:8000/api/health

Stop the application with `Ctrl+C`.

## Data and Method

- Actual wind generation comes from Elexon `FUELHH`, filtered to `fuelType = WIND`.
- Forecasts come from Elexon `WINDFOR`.
- Half-hourly actuals are averaged into hourly values to match the hourly forecast data.
- The app selects the latest forecast published by **11:00 UK time on the day before delivery**.

The 11:00 cutoff is a pilot assumption and should be confirmed with the client.

Forecast error is calculated as:

`Forecast error = Forecast generation - Actual generation`

Positive bias means the forecast overestimated actual generation.

## Links

- **GitHub:** `<ADD_REPOSITORY_URL>`
- **Live app:** `<ADD_DEPLOYED_APP_URL>`
- **Demo video:** `<ADD_UNLISTED_YOUTUBE_URL>`

The application has not yet been deployed. Add the live URL after deployment and testing.

## AI Tools

OpenAI ChatGPT was used to assist with coding, documentation.

## Limitations

This is a pilot dashboard, not an automated trading system. It uses national wind data only and does not calculate electricity demand or procurement requirements. Data completeness and the assumed decision cutoff should be validated before operational use.
