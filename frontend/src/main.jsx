import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Area, AreaChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2,
  Clock3, Download, ExternalLink, RefreshCw, Wind, Zap,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function formatNumber(value, decimals = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}


function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}


function Metric({ label, value, unit, description, icon: Icon }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={17} /></span>
      </div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-sub">{description}</div>
    </div>
  );
}

function App() {
  const [month, setMonth] = useState("2026-01");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/analysis?month=${month}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Could not load data.");
      setData(result);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [month]);

  const records = (data?.records || []).filter((row) => {
    if (row.actualMW == null) return false;
    if (selectedDay === "all") return true;
    return new Date(row.startTime).toLocaleDateString("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
}) === selectedDay;
  });

  const chartData = records
    .filter((row) => row.forecastMW != null)
    .map((row) => ({
      ...row,
      
label: new Date(row.startTime).toLocaleString("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}),

      actual: row.actualMW,
      forecast: row.forecastMW,
    }));

  const metrics = data?.metrics || {};

  function exportCSV() {
    if (!data) return;
    const columns = [
      "startTime", "actualMW", "forecastMW", "publishTime",
      "cutoffTime", "errorMW", "absoluteErrorMW", "apePct",
    ];
    const csv = [
      columns.join(","),
      ...data.records.map((row) => columns.map((column) => row[column] ?? "").join(",")),
    ].join("\n");
    const file = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `windtrade-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Wind size={22} /></div>
          <div><strong>WindTrade</strong><span>ANALYTICS</span></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="nav-item active"><Activity size={18} /> Forecast intelligence</div>
        <div className="nav-item muted"><Zap size={18} /> Procurement context <span className="soon">PILOT</span></div>
        <div className="sidebar-bottom">
          <div className="source-badge"><span className="pulse" /><div><b>Elexon BMRS</b><small>Public system data</small></div></div>
          <div className="sidebar-foot">UK POWER MARKETS<br />PILOT ENVIRONMENT · V1.0</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">Energy markets <span>/</span> Forecast intelligence</div>
          <div className="top-right"><span className="live-dot" /> DATA-LED PILOT <div className="avatar">WT</div></div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">NATIONAL WIND · DAY-AHEAD DECISION SUPPORT</div>
            <h1>Forecast intelligence</h1>
            <p>Understand the wind outlook and measure forecast error before procurement decisions.</p>
          </div>
          <div className="heading-actions">
            <label className="month-select"><CalendarDays size={16} />
              <input aria-label="Analysis month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <button className="button-secondary" onClick={exportCSV} disabled={!data}><Download size={16} /> Export CSV</button>
            <button className="button-primary" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button>
          </div>
        </section>

        <div className="context-strip">
          <div className="context-icon"><Clock3 size={18} /></div>
          <div><b>Day-ahead forecast snapshot</b><span>Uses the latest forecast published by 11:00 UK time on the day before delivery.</span></div>
          <span className="assumption">PILOT ASSUMPTION</span>
        </div>

        {error && <div className="error-panel"><b>Data connection unavailable</b><span>{error}</span><small>Check the backend and Elexon API response.</small><button className="button-secondary" onClick={loadData}>Try again</button></div>}
        {loading && !data && <div className="loading-panel"><div className="loader" /><b>Loading Elexon data</b><span>Getting wind actuals and forecast history…</span></div>}

        {data && (
          <>
            <section className="metrics-grid">
              <Metric label="Mean absolute error" value={formatNumber(metrics.maeMW)} unit="MW" description="Typical forecast miss" icon={Activity} />
              <Metric label="Forecast bias" value={metrics.biasMW == null ? "—" : `${metrics.biasMW > 0 ? "+" : ""}${formatNumber(metrics.biasMW)}`} unit="MW" description={metrics.biasMW > 0 ? "Forecast overestimated wind" : metrics.biasMW < 0 ? "Forecast underestimated wind" : "Average error direction"} icon={metrics.biasMW > 0 ? ArrowUpRight : ArrowDownRight} />
              <Metric label="Matched intervals" value={formatNumber(metrics.matchedIntervals)} unit={`/ ${formatNumber(metrics.intervals)}`} description={`${formatNumber(metrics.coveragePct, 1)}% forecast coverage`} icon={CheckCircle2} />
              <Metric label="Average actual wind" value={formatNumber(metrics.actualAvgMW)} unit="MW" description={`Peak outturn ${formatNumber(metrics.actualPeakMW)} MW`} icon={Wind} />
            </section>

            <section className="content-grid">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div><div className="eyebrow">FORECAST VS ACTUAL</div><h2>Wind generation profile</h2><p>Hourly generation · MW</p></div>
                  <div className="range-control">
                    <button className={selectedDay === "all" ? "selected" : ""} onClick={() => setSelectedDay("all")}>Month</button>
                    <button className={selectedDay === "1" ? "selected" : ""} onClick={() => setSelectedDay("1")}>Day 1</button>
                  </div>
                </div>
                {chartData.length ? (
                  <>
                    <div className="chart-summary"><span><i className="legend-dot actual-dot" /> Actual generation</span><span><i className="legend-dot forecast-dot" /> Day-ahead forecast</span></div>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <defs><linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#21b7a8" stopOpacity={0.22} /><stop offset="100%" stopColor="#21b7a8" stopOpacity={0.01} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8edf2" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8793a3" }} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#8793a3" }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} width={42} />
                          
<Tooltip
  labelFormatter={(_, items) =>
    items?.[0]?.payload?.startTime
      ? new Date(items[0].payload.startTime).toLocaleString("en-GB", {
          timeZone: "Europe/London",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }) + " UK time"
      : ""
  }
  formatter={(value, name) => [
    `${formatNumber(value)} MW`,
    name === "actual" ? "Actual generation" : "Forecast generation",
  ]}
/>

                          <Area type="monotone" dataKey="actual" stroke="#159e92" strokeWidth={2} fill="url(#actualFill)" dot={false} />
                          <Line type="monotone" dataKey="forecast" stroke="#5369e8" strokeWidth={1.8} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-foot"><span>{chartData.length} intervals plotted</span><span>Times shown in UK local time</span></div>
                  </>
                ) : <div className="empty-chart">No forecast records for this selection.</div>}
              </div>

              <div className="panel accuracy-panel">
                <div className="panel-heading"><div><div className="eyebrow">ERROR SUMMARY</div><h2>Forecast accuracy</h2><p>Decision-time forecast compared with actual</p></div></div>
                <div className="accuracy-list">
                  <div><span>Root mean squared error</span><b>{formatNumber(metrics.rmseMW)} MW</b></div>
                  <div><span>Mean absolute percentage error*</span><b>{metrics.mapePct == null ? "—" : `${formatNumber(metrics.mapePct, 1)}%`}</b></div>
                  <div><span>Average forecast</span><b>{formatNumber(metrics.forecastAvgMW)} MW</b></div>
                  <div><span>Peak forecast</span><b>{formatNumber(metrics.forecastPeakMW)} MW</b></div>
                </div>
                <div className="note">*Percentage error can be misleading when actual generation is close to zero. MAE and RMSE are the main error measures.</div>
              </div>
            </section>

            <section className="panel table-panel">
              <div className="panel-heading"><div><div className="eyebrow">AUDITABLE RECORDS</div><h2>Forecast decision log</h2><p>Selected forecast, publication time and actual generation</p></div><span className="record-count">{records.length} records</span></div>
              <div className="table-scroll">
                <table><thead><tr><th>Delivery time</th><th>Forecast published</th><th>Forecast (MW)</th><th>Actual (MW)</th><th>Error (MW)</th><th>Assessment</th></tr></thead>
                  <tbody>{records.slice(0, 100).map((row) => (
                    <tr key={row.startTime}>
                      <td className="time-cell">{formatTime(row.startTime)}</td><td>{formatTime(row.publishTime)}</td>
                      <td>{formatNumber(row.forecastMW)}</td><td>{formatNumber(row.actualMW)}</td>
                      <td className={row.errorMW > 0 ? "error-positive" : row.errorMW < 0 ? "error-negative" : ""}>{row.errorMW == null ? "—" : `${row.errorMW > 0 ? "+" : ""}${formatNumber(row.errorMW)}`}</td>
                      <td>{row.errorMW == null ? <span className="status missing">No match</span> : Math.abs(row.errorMW) < 500 ? <span className="status good">Within 500 MW</span> : <span className="status review">Review error</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {records.length > 100 && <div className="table-note">Showing the first 100 rows. Export CSV for all records.</div>}
                {!records.length && <div className="table-note">No actual generation records are available.</div>}
              </div>
            </section>

            <footer className="footer">
              <span>Source: <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream" target="_blank" rel="noreferrer">FUELHH</a> and <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream" target="_blank" rel="noreferrer">WINDFOR</a> datasets <ExternalLink size={12} /></span>
              <span>National wind · Hourly · UK local time · {month}</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
