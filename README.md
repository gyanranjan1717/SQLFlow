# SQLFlow - Step-by-Step SQL Execution Visualizer

An interactive, visual SQL learning and execution debugging application. It breaks down any SQL query into its exact **10 Canonical Internal Logical Processing Steps**:

1. **`FROM / JOIN`**: Identifies source tables, loads raw records, and joins datasets together.
2. **`WHERE`**: Filters individual raw rows *before* any grouping or aggregation happens.
3. **`GROUP BY`**: Collapses remaining rows into unique summary buckets based on specified columns.
4. **`Aggregate Functions (SUM, COUNT, AVG, etc.)`**: Calculates single aggregated values for each bucket.
5. **`HAVING`**: Filters out entire summary groups based on aggregate results.
6. **`Window Functions (OVER())`**: Executes ranking, rolling averages, and offsets across dataset without collapsing rows.
7. **`SELECT`**: Evaluates column expressions, computes math formulas, and sets column aliases.
8. **`DISTINCT`**: Scans the projected SELECT list and removes duplicate rows.
9. **`ORDER BY`**: Sorts the final deduplicated result set hierarchically.
10. **`LIMIT / OFFSET`**: Trims the output to return only the specified row count.

---

## Tech Stack

- **Backend**: Python 3.13 + FastAPI + `sqlglot` (AST parser) + `duckdb` & `pandas` (relational execution and row snapshotting engine)
- **Frontend**: React 18 + Vite + Monaco Editor (`@monaco-editor/react`) + Tailwind CSS + Lucide Icons

---

## Quick Start Guide

### 1. Start the Backend Server (FastAPI)
```bash
cd backend
.\start
```
*Backend runs on `http://127.0.0.1:8000` (Swagger docs at `/docs`).*

> **Old command (same thing, the long way):**
> ```bash
> .\venv\Scripts\python.exe run.py
> ```

### 2. Start the Frontend App (React + Vite)
```bash
cd frontend
npm start
```
*Frontend runs on `http://localhost:5173`.*

> **Old command (same thing, the long way):**
> ```bash
> node ./node_modules/vite/bin/vite.js
> ```

---

## Features

- **Monaco SQL Editor**: Code editor with SQL syntax highlighting, formatting, and shortcut execution (`Ctrl+Enter`).
- **Interactive 10-Step Scrubber**: Step forward, backward, or autoplay through all 10 execution phases with variable playback speeds.
- **Row-Level Explanations**: Visual tags and explanations on why each row passed or failed (green for passed, red strikethrough for filtered).
- **Group Bucket Deck**: Visual breakdown cards for `GROUP BY` buckets showing nested underlying records and aggregate accumulators (`SUM`, `COUNT`, `AVG`).
- **Pre-Loaded Datasets**: Includes `employees`, `orders`, `students`, `departments`, with 1-click curated query challenges.
- **Custom CSV/JSON Uploader**: Upload your own datasets and test queries directly.
- **Table Schema Inspector**: Inspect table columns, types, and preview rows with 1-click column insertion.
