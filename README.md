# WindTrade Analytics

WindTrade Analytics is a full-stack pilot application that helps a UK electricity utility compare national wind generation forecasts with actual generation. It uses data exclusively from Elexon BMRS datasets `FUELHH` and `WINDFOR`.

The application is built with **React** for the frontend, **Python and FastAPI** for the backend, and **Docker Compose** to run both services locally.

## What it does

- Displays national wind generation actuals and forecasts for January 2026.
- Aggregates 30-minute actual generation records into hourly averages to align them with hourly forecasts.
- Calculates mean absolute error (MAE), root mean squared error (RMSE), forecast bias, mean absolute percentage error (MAPE), and forecast coverage.
- Shows forecast publication times and the corresponding delivery intervals.
- Exports the selected month's records as a CSV file.
- Provides a dashboard with monthly and daily chart views.
- Runs locally using Docker Compose or with Python and Node.js separately.

## Key business rule

The dashboard uses the latest forecast published by **11:00 UK time on the day before delivery**.

This is an explicit pilot assumption because the assignment brief does not specify the client's exact trading cutoff. It should be confirmed with the client before operational use. Forecasts published after the cutoff must not be used to evaluate the forecast information available when the purchasing decision was made.

The error is calculated as:

`errorMW = forecastMW - actualMW`

A positive forecast bias means the forecast overestimated actual wind generation on average. Forecast coverage indicates the proportion of evaluation intervals with
