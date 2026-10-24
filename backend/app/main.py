"""Small API for comparing Elexon wind forecasts with actual generation."""
from datetime import date, datetime, time, timedelta
import os
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

API_URL = os.getenv("ELEXON_API_URL", "https://data.elexon.co.uk/bmrs/api/v1")
UK_TIME = ZoneInfo("Europe/London")

app = FastAPI(title="WindTrade Analytics API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)



def fetch_dataset(dataset, params):
    """Download one Elexon dataset using the given filters."""
    url = f"{API_URL}/datasets/{dataset}/stream"

    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()

    data = response.json()

    if isinstance(data, dict):
        data = data.get("data", data.get("results", []))

    if not isinstance(data, list):
        raise ValueError(f"Unexpected response from {dataset}")

    return pd.DataFrame(data)


def prepare_data(frame, dataset):
    """Convert timestamps and generation values to consistent types."""
    if frame.empty:
        return frame
    if "startTime" not in frame or "generation" not in frame:
        raise ValueError(f"The {dataset} response is missing required fields")

    frame["startTime"] = pd.to_datetime(frame["startTime"], utc=True, errors="coerce")
    frame["generation"] = pd.to_numeric(frame["generation"], errors="coerce")
    frame = frame.dropna(subset=["startTime", "generation"])

    if dataset == "WINDFOR":
        if "publishTime" not in frame:
            raise ValueError("The WINDFOR response is missing publishTime")
        frame["publishTime"] = pd.to_datetime(frame["publishTime"], utc=True, errors="coerce")
        frame = frame.dropna(subset=["publishTime"])
    return frame


def get_month_dates(month):
    month_start = date.fromisoformat(month + "-01")
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return month_start, next_month


def load_data(month):
    month_start, next_month = get_month_dates(month)
    # A small buffer lets us retrieve forecasts published before delivery starts.
    fetch_start = month_start - timedelta(days=2)
    fetch_end = next_month + timedelta(days=1)

    
    actuals = prepare_data(
        fetch_dataset(
            "FUELHH",
            {
                "settlementDateFrom": month_start.isoformat(),
                "settlementDateTo": (next_month - timedelta(days=1)).isoformat(),
            },
        ),
        "FUELHH",
    )

    forecasts = prepare_data(
        fetch_dataset(
            "WINDFOR",
            {
                "publishDateTimeFrom": fetch_start.isoformat() + "T00:00:00Z",
                "publishDateTimeTo": fetch_end.isoformat() + "T00:00:00Z",
            },
        ),
        "WINDFOR",
    )


    if not actuals.empty and "fuelType" in actuals:
        actuals = actuals[actuals["fuelType"].str.upper() == "WIND"]

    # Keep delivery intervals in the requested month, using UK local dates.
    if not actuals.empty:
        local_date = actuals["startTime"].dt.tz_convert(UK_TIME).dt.date
        actuals = actuals[(local_date >= month_start) & (local_date < next_month)]
    if not forecasts.empty:
        local_date = forecasts["startTime"].dt.tz_convert(UK_TIME).dt.date
        forecasts = forecasts[(local_date >= month_start) & (local_date < next_month)]

    return actuals, forecasts


def decision_cutoff(delivery_time):
    """Pilot assumption: forecast must be published by 11:00 UK time on D-1."""
    local_delivery = delivery_time.tz_convert(UK_TIME)
    previous_day = local_delivery.date() - timedelta(days=1)
    cutoff = datetime.combine(previous_day, time(11, 0), tzinfo=UK_TIME)
    return pd.Timestamp(cutoff).tz_convert("UTC")




def match_forecasts(actuals, forecasts):
    """Match hourly actual generation with the latest eligible forecast."""
    if actuals.empty:
        return pd.DataFrame()

    # Keep the columns we need and remove duplicate actual timestamps.
    actuals = actuals[["startTime", "generation"]].copy()
    actuals = actuals.rename(columns={"generation": "actualMW"})
    actuals = actuals.drop_duplicates("startTime", keep="last")

    # Convert half-hourly actuals to hourly averages.
    actuals = actuals.set_index("startTime").sort_index()
    hourly_actuals = actuals["actualMW"].resample("1h").mean()
    actuals = hourly_actuals.reset_index()

    # If there are no forecasts, return actuals with missing forecast values.
    if forecasts.empty:
        actuals["forecastMW"] = None
        actuals["publishTime"] = pd.NaT
        actuals["cutoffTime"] = actuals["startTime"].map(decision_cutoff)
        actuals["errorMW"] = None
        actuals["absoluteErrorMW"] = None
        actuals["apePct"] = None
        return actuals

    # Prepare forecast data.
    forecasts = forecasts[
        ["startTime", "publishTime", "generation"]
    ].copy()
    forecasts = forecasts.rename(columns={"generation": "forecastMW"})

    # Keep forecasts published on or before the decision cutoff.
    forecasts["cutoffTime"] = forecasts["startTime"].map(decision_cutoff)
    forecasts = forecasts[
        forecasts["publishTime"] <= forecasts["cutoffTime"]
    ]

    # For each delivery hour, keep the latest eligible forecast.
    forecasts = forecasts.sort_values("publishTime")
    forecasts = forecasts.drop_duplicates("startTime", keep="last")

    # Match hourly actuals with hourly forecasts.
    result = actuals.merge(
        forecasts[["startTime", "forecastMW", "publishTime", "cutoffTime"]],
        on="startTime",
        how="left",
    )

    # Calculate forecast errors.
    result["errorMW"] = result["forecastMW"] - result["actualMW"]
    result["absoluteErrorMW"] = result["errorMW"].abs()

    # Skip MAPE when actual generation is zero or no forecast exists.
    result["apePct"] = result.apply(
        lambda row: abs(row["errorMW"]) / abs(row["actualMW"]) * 100
        if pd.notna(row["errorMW"]) and row["actualMW"] != 0
        else None,
        axis=1,
    )

    return result.sort_values("startTime")



def number(value):
    return None if pd.isna(value) else round(float(value), 2)


def timestamp(value):
    return None if pd.isna(value) else pd.Timestamp(value).isoformat()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analysis")
def analysis(month: str = Query("2026-01", pattern=r"^\d{4}-\d{2}$")):
    try:
        actuals, forecasts = load_data(month)
        data = match_forecasts(actuals, forecasts)
    except (requests.RequestException, ValueError, KeyError) as error:
        raise HTTPException(status_code=502, detail=f"Could not retrieve Elexon data: {error}") from error

    if data.empty:
        return {
            "month": month,
            "source": "Elexon BMRS",
            "metrics": {},
            "records": [],
            "message": "No wind actuals were returned for this month.",
        }

    matched = data.dropna(subset=["forecastMW", "actualMW"])
    errors = matched["forecastMW"] - matched["actualMW"]
    metrics = {
        "intervals": int(len(data)),
        "matchedIntervals": int(len(matched)),
        "coveragePct": number(len(matched) / len(data) * 100),
        "maeMW": number(errors.abs().mean()) if len(matched) else None,
        "rmseMW": number((errors.pow(2).mean()) ** 0.5) if len(matched) else None,
        "biasMW": number(errors.mean()) if len(matched) else None,
        "mapePct": number(matched["apePct"].mean()) if len(matched) and matched["apePct"].notna().any() else None,
        "actualAvgMW": number(data["actualMW"].mean()),
        "forecastAvgMW": number(matched["forecastMW"].mean()) if len(matched) else None,
        "actualPeakMW": number(data["actualMW"].max()),
        "forecastPeakMW": number(matched["forecastMW"].max()) if len(matched) else None,
    }

    records = []
    for _, row in data.iterrows():
        records.append({
            "startTime": timestamp(row.get("startTime")),
            "actualMW": number(row.get("actualMW")),
            "forecastMW": number(row.get("forecastMW")),
            "publishTime": timestamp(row.get("publishTime")),
            "cutoffTime": timestamp(row.get("cutoffTime")),
            "errorMW": number(row.get("errorMW")),
            "absoluteErrorMW": number(row.get("absoluteErrorMW")),
            "apePct": number(row.get("apePct")),
        })

    return {
        "month": month,
        "source": "Elexon BMRS FUELHH + WINDFOR",
        "decisionRule": "Latest forecast published by 11:00 UK time on the day before delivery (pilot assumption).",
        "metrics": metrics,
        "records": records,
    }
