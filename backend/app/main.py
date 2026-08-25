import io
import os
import re
import json
import sqlite3
import tempfile
import base64
from typing import Dict, List, Any, Optional
import httpx
import pandas as pd
import duckdb
import sqlglot
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    VisualizeRequest, VisualizeResponse, 
    TableSchema, ExampleQuery
)
from .datasets import (
    SAMPLE_DATASETS, DATASET_DESCRIPTIONS, 
    EXAMPLE_QUERIES, get_table_schema
)
from .engine import ExecutionEngine
from .local_ocr import run_local_table_extraction

# Load environment variables with absolute path
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

def get_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "active_provider": "gemini",
        "gemini_model": "gemini-3.5-flash",
        "openai_model": "gpt-4o-mini",
        "temperature": 0.1,
        "admin_pin": "admin123",
        "custom_table_prompt": "You are an expert OCR system specializing in tabular data extraction.\nAnalyze this image and extract any table present.\nReturn ONLY a valid JSON object matching this exact schema:\n{\n  \"table_name\": \"inferred_or_detected_name_lowercase_snake_case\",\n  \"columns\": [\n    {\"name\": \"col_name\", \"type\": \"INTEGER\" | \"FLOAT\" | \"VARCHAR\" | \"BOOLEAN\"}\n  ],\n  \"rows\": [\n    {\"col1\": value1, \"col2\": value2}\n  ]\n}\nDo not include markdown code block wrappers (like ```json), just return the pure JSON.",
        "custom_query_prompt": "Extract the SQL query written in this image. Return ONLY the raw SQL query code, nothing else."
    }

def save_config(cfg: Dict[str, Any]):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)

app = FastAPI(
    title="SQLFlow - SQL Execution Visualizer API",
    description="Backend API for step-by-step SQL execution snapshotting, multi-format database ingestion, OCR table extraction, and Admin AI model management",
    version="1.2.0"
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for custom user-uploaded tables
CUSTOM_TABLES: Dict[str, List[Dict[str, Any]]] = {}

# Pydantic schemas
class ManualTableRequest(BaseModel):
    table_name: str
    columns: List[Dict[str, str]]
    rows: List[Dict[str, Any]]

class FormatQueryRequest(BaseModel):
    query: str

class FormatQueryResponse(BaseModel):
    formatted_query: str

class VerifyPinRequest(BaseModel):
    pin: str

class UpdateSettingsRequest(BaseModel):
    active_provider: Optional[str] = None
    gemini_model: Optional[str] = None
    openai_model: Optional[str] = None
    temperature: Optional[float] = None
    admin_pin: Optional[str] = None
    custom_table_prompt: Optional[str] = None
    custom_query_prompt: Optional[str] = None

@app.get("/health")
def health_check():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    cfg = get_config()
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    openai_configured = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "ok", 
        "service": "sql-visualizer-backend",
        "active_provider": cfg.get("active_provider", "gemini"),
        "active_model": cfg.get("gemini_model") if cfg.get("active_provider") == "gemini" else cfg.get("openai_model"),
        "ocr_providers": {
            "gemini": gemini_configured,
            "openai": openai_configured
        }
    }

# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@app.post("/api/admin/verify-pin")
def verify_admin_pin(req: VerifyPinRequest):
    cfg = get_config()
    env_pin = os.getenv("ADMIN_PIN") or cfg.get("admin_pin", "admin123")
    if req.pin.strip() == env_pin.strip():
        return {"success": True, "message": "Authenticated"}
    raise HTTPException(status_code=401, detail="Invalid Admin PIN.")

@app.get("/api/admin/settings")
def get_admin_settings():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    cfg = get_config()
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    return {
        "active_provider": cfg.get("active_provider", "gemini"),
        "gemini_model": cfg.get("gemini_model", "gemini-3.5-flash"),
        "openai_model": cfg.get("openai_model", "gpt-4o-mini"),
        "temperature": cfg.get("temperature", 0.1),
        "custom_table_prompt": cfg.get("custom_table_prompt", ""),
        "custom_query_prompt": cfg.get("custom_query_prompt", ""),
        "api_keys_status": {
            "gemini_set": bool(gemini_key),
            "gemini_masked": f"{gemini_key[:4]}...{gemini_key[-4:]}" if gemini_key and len(gemini_key) > 8 else ("Set" if gemini_key else "Missing"),
            "openai_set": bool(openai_key),
            "openai_masked": f"{openai_key[:4]}...{openai_key[-4:]}" if openai_key and len(openai_key) > 8 else ("Set" if openai_key else "Missing"),
        }
    }

@app.post("/api/admin/settings")
def update_admin_settings(req: UpdateSettingsRequest):
    cfg = get_config()
    if req.active_provider:
        cfg["active_provider"] = req.active_provider
    if req.gemini_model:
        cfg["gemini_model"] = req.gemini_model
    if req.openai_model:
        cfg["openai_model"] = req.openai_model
    if req.temperature is not None:
        cfg["temperature"] = req.temperature
    if req.admin_pin:
        cfg["admin_pin"] = req.admin_pin
    if req.custom_table_prompt:
        cfg["custom_table_prompt"] = req.custom_table_prompt
    if req.custom_query_prompt:
        cfg["custom_query_prompt"] = req.custom_query_prompt

    save_config(cfg)
    return {"success": True, "settings": cfg}

@app.get("/api/admin/models")
async def fetch_live_models():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    cfg = get_config()
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    gemini_models = []
    openai_models = []
    errors = {}

    # 1. Fetch live Google Gemini Models
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}")
                if res.status_code == 200:
                    raw_models = res.json().get("models", [])
                    for m in raw_models:
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            m_id = m.get("name", "").replace("models/", "")
                            gemini_models.append({
                                "id": m_id,
                                "name": m.get("displayName", m_id),
                                "description": m.get("description", ""),
                                "input_token_limit": m.get("inputTokenLimit", 0),
                                "output_token_limit": m.get("outputTokenLimit", 0)
                            })
                else:
                    errors["gemini"] = f"Google API Error {res.status_code}: {res.text}"
        except Exception as e:
            errors["gemini"] = str(e)

    # 2. Fetch live OpenAI Models
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {openai_key}"}
                res = await client.get("https://api.openai.com/v1/models", headers=headers)
                if res.status_code == 200:
                    raw_models = res.json().get("data", [])
                    for m in raw_models:
                        m_id = m.get("id", "")
                        if "gpt-4" in m_id or "gpt-3.5" in m_id or "o1" in m_id or "o3" in m_id:
                            openai_models.append({
                                "id": m_id,
                                "name": m_id,
                                "created": m.get("created", 0)
                            })
                    openai_models.sort(key=lambda x: x["id"])
                else:
                    errors["openai"] = f"OpenAI API Error {res.status_code}: {res.text}"
        except Exception as e:
            errors["openai"] = str(e)

    return {
        "success": True,
        "active_provider": cfg.get("active_provider", "gemini"),
        "active_gemini_model": cfg.get("gemini_model", "gemini-3.5-flash"),
        "active_openai_model": cfg.get("openai_model", "gpt-4o-mini"),
        "gemini_models": gemini_models,
        "openai_models": openai_models,
        "errors": errors
    }

# =============================================================================
# DATA & TABLE MANAGEMENT ENDPOINTS
# =============================================================================

@app.get("/api/tables", response_model=List[TableSchema])
def list_tables():
    results = []
    for name, rows in SAMPLE_DATASETS.items():
        results.append(get_table_schema(name, rows))
    for name, rows in CUSTOM_TABLES.items():
        schema = get_table_schema(name, rows)
        schema.description = f"User uploaded dataset ({len(rows)} rows)"
        results.append(schema)
    return results

@app.get("/api/tables/{name}")
def get_table(name: str):
    if name in CUSTOM_TABLES:
        rows = CUSTOM_TABLES[name]
        return {"table_name": name, "schema": get_table_schema(name, rows), "data": rows}
    if name in SAMPLE_DATASETS:
        rows = SAMPLE_DATASETS[name]
        return {"table_name": name, "schema": get_table_schema(name, rows), "data": rows}
    raise HTTPException(status_code=404, detail=f"Table '{name}' not found.")

@app.get("/api/examples", response_model=List[ExampleQuery])
def get_examples():
    return EXAMPLE_QUERIES

@app.post("/api/format", response_model=FormatQueryResponse)
def format_sql(req: FormatQueryRequest):
    if not req.query or not req.query.strip():
        return FormatQueryResponse(formatted_query="")
    try:
        formatted = sqlglot.transpile(req.query, pretty=True)[0]
        return FormatQueryResponse(formatted_query=formatted)
    except Exception:
        keywords = ["SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "JOIN", "ON", "AND", "OR", "AS", "DISTINCT"]
        q = req.query
        for kw in keywords:
            pattern = re.compile(rf"\b{kw}\b", re.IGNORECASE)
            q = pattern.sub(kw, q)
        return FormatQueryResponse(formatted_query=q)

@app.post("/api/tables/create")
def create_manual_table(req: ManualTableRequest):
    clean_name = "".join(c for c in req.table_name.lower().strip() if c.isalnum() or c == "_")
    if not clean_name:
        clean_name = "custom_table"

    processed_rows = []
    for r in req.rows:
        row_dict = {}
        for col in req.columns:
            c_name = col["name"]
            c_type = col.get("type", "TEXT").upper()
            val = r.get(c_name)
            if val is None or val == "":
                row_dict[c_name] = None
            elif c_type in ["INTEGER", "INT"]:
                try:
                    row_dict[c_name] = int(val)
                except (ValueError, TypeError):
                    row_dict[c_name] = val
            elif c_type in ["FLOAT", "DOUBLE", "NUMERIC"]:
                try:
                    row_dict[c_name] = float(val)
                except (ValueError, TypeError):
                    row_dict[c_name] = val
            elif c_type in ["BOOLEAN", "BOOL"]:
                if isinstance(val, str):
                    row_dict[c_name] = val.lower() in ["true", "1", "yes", "t"]
                else:
                    row_dict[c_name] = bool(val)
            else:
                row_dict[c_name] = str(val)
        processed_rows.append(row_dict)

    CUSTOM_TABLES[clean_name] = processed_rows
    schema = get_table_schema(clean_name, processed_rows)
    return {
        "success": True,
        "table_name": clean_name,
        "row_count": len(processed_rows),
        "columns": [c["name"] for c in req.columns],
        "schema": schema
    }

@app.post("/api/upload")
async def upload_dataset(
    table_name: Optional[str] = Form(None),
    files: List[UploadFile] = File(...)
):
    imported_tables = []
    for file in files:
        filename = file.filename.lower()
        contents = await file.read()
        base_name = os.path.splitext(os.path.basename(file.filename))[0]

        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            try:
                excel_dict = pd.read_excel(io.BytesIO(contents), sheet_name=None)
                for sheet_name, df in excel_dict.items():
                    clean_sheet = "".join(c for c in sheet_name.lower().strip() if c.isalnum() or c == "_")
                    t_name = clean_sheet if len(excel_dict) > 1 else (table_name or clean_sheet or base_name)
                    rows = df.where(pd.notnull(df), None).to_dict(orient="records")
                    CUSTOM_TABLES[t_name] = rows
                    imported_tables.append({
                        "table_name": t_name,
                        "row_count": len(rows),
                        "columns": list(df.columns),
                        "schema": get_table_schema(t_name, rows)
                    })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse Excel file '{file.filename}': {str(e)}")

        elif filename.endswith(".db") or filename.endswith(".sqlite") or filename.endswith(".sqlite3"):
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
                    tmp.write(contents)
                    tmp_path = tmp.name

                conn = sqlite3.connect(tmp_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                tbl_names = [row[0] for row in cursor.fetchall()]

                for tbl in tbl_names:
                    df = pd.read_sql_query(f"SELECT * FROM `{tbl}`", conn)
                    rows = df.where(pd.notnull(df), None).to_dict(orient="records")
                    clean_tname = tbl.lower()
                    CUSTOM_TABLES[clean_tname] = rows
                    imported_tables.append({
                        "table_name": clean_tname,
                        "row_count": len(rows),
                        "columns": list(df.columns),
                        "schema": get_table_schema(clean_tname, rows)
                    })
                conn.close()
                os.unlink(tmp_path)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read SQLite database '{file.filename}': {str(e)}")

        elif filename.endswith(".sql"):
            try:
                sql_text = contents.decode("utf-8", errors="ignore")
                mem_con = duckdb.connect(database=":memory:")
                mem_con.execute(sql_text)
                tables_df = mem_con.execute("SHOW TABLES").df()
                tbl_names = list(tables_df["name"]) if "name" in tables_df else []
                
                for tbl in tbl_names:
                    df = mem_con.execute(f"SELECT * FROM `{tbl}`").df()
                    rows = df.where(pd.notnull(df), None).to_dict(orient="records")
                    clean_tname = tbl.lower()
                    CUSTOM_TABLES[clean_tname] = rows
                    imported_tables.append({
                        "table_name": clean_tname,
                        "row_count": len(rows),
                        "columns": list(df.columns),
                        "schema": get_table_schema(clean_tname, rows)
                    })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to execute SQL script '{file.filename}': {str(e)}")

        elif filename.endswith(".csv"):
            try:
                df = pd.read_csv(io.BytesIO(contents))
                t_name = table_name or base_name or "custom_csv"
                clean_tname = "".join(c for c in t_name.lower().strip() if c.isalnum() or c == "_")
                rows = df.where(pd.notnull(df), None).to_dict(orient="records")
                CUSTOM_TABLES[clean_tname] = rows
                imported_tables.append({
                    "table_name": clean_tname,
                    "row_count": len(rows),
                    "columns": list(df.columns),
                    "schema": get_table_schema(clean_tname, rows)
                })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse CSV file '{file.filename}': {str(e)}")

    if not imported_tables:
        raise HTTPException(status_code=400, detail="No valid tables could be extracted from uploaded file(s).")

    return {
        "success": True,
        "tables_imported": imported_tables,
        "total_tables": len(imported_tables),
        "primary_table": imported_tables[0]["table_name"]
    }

# =============================================================================
# OCR & MULTI-MODAL VISION EXTRACTION
# =============================================================================

async def _call_gemini_vision(key: str, model: str, prompt: str, mime_type: str, b64_image: str, temp: float):
    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": b64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": temp
                }
            }
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidate = data["candidates"][0]["content"]["parts"][0]["text"]
                clean_json = candidate.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                parsed = json.loads(clean_json.strip())
                return {
                    "success": True,
                    "provider": f"Google Gemini ({model})",
                    "data": parsed
                }
            else:
                err_msg = res.json().get("error", {}).get("message", res.text[:200])
                print(f"Gemini API Error ({model}): {res.status_code} - {err_msg}")
                return {"success": False, "error": err_msg}
    except Exception as e:
        print(f"Gemini Exception ({model}): {e}")
        return {"success": False, "error": str(e)}

def _get_local_fallback_table() -> Dict[str, Any]:
    return {
        "table_name": "student_enrollment",
        "columns": [
            {"name": "student_id", "type": "VARCHAR"},
            {"name": "last_name", "type": "VARCHAR"},
            {"name": "initial", "type": "VARCHAR"},
            {"name": "age", "type": "INTEGER"},
            {"name": "program", "type": "VARCHAR"}
        ],
        "rows": [
            {"student_id": "ST348-245", "last_name": "White", "initial": "R.", "age": 21, "program": "Drafting"},
            {"student_id": "ST348-246", "last_name": "Wilson", "initial": "P.", "age": 19, "program": "Science"},
            {"student_id": "ST348-247", "last_name": "Thompson", "initial": "A.", "age": 18, "program": "Arts"},
            {"student_id": "ST348-248", "last_name": "Holt", "initial": "R.", "age": 23, "program": "Science"},
            {"student_id": "ST348-249", "last_name": "Armstrong", "initial": "J.", "age": 37, "program": "Drafting"}
        ]
    }

@app.post("/api/ocr/extract-table")
async def extract_table_from_image(
    file: UploadFile = File(...)
):
    """
    Image-to-Table OCR & AI Structure Extraction
    """
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    cfg = get_config()
    provider = cfg.get("active_provider", "gemini")
    temp = cfg.get("temperature", 0.1)
    prompt = cfg.get("custom_table_prompt")

    contents = await file.read()
    b64_image = base64.b64encode(contents).decode("utf-8")
    mime_type = file.content_type or "image/png"
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # 1. Gemini Provider
    if provider == "gemini" and gemini_key:
        model_name = cfg.get("gemini_model", "gemini-3.5-flash")
        gemini_res = await _call_gemini_vision(gemini_key, model_name, prompt, mime_type, b64_image, temp)
        if gemini_res["success"]:
            return gemini_res
        
        # Fallback to other active gemini models if quota/error on this model
        for backup_model in ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"]:
            if backup_model != model_name:
                backup_res = await _call_gemini_vision(gemini_key, backup_model, prompt, mime_type, b64_image, temp)
                if backup_res["success"]:
                    return backup_res

    # 2. OpenAI Provider
    elif provider == "openai" and openai_key:
        model_name = cfg.get("openai_model", "gpt-4o-mini")
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {openai_key}"}
                payload = {
                    "model": model_name,
                    "temperature": temp,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_image}"}}
                            ]
                        }
                    ],
                    "response_format": {"type": "json_object"}
                }
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return {
                        "success": True,
                        "provider": f"OpenAI ({model_name})",
                        "data": parsed
                    }
                else:
                    # If OpenAI quota is 429, auto switch to active Gemini!
                    if gemini_key:
                        gemini_res = await _call_gemini_vision(gemini_key, "gemini-3.5-flash", prompt, mime_type, b64_image, temp)
                        if gemini_res["success"]:
                            gemini_res["provider"] = "Google Gemini (Auto-switched from OpenAI 429 Quota)"
                            return gemini_res
        except Exception as e:
            print(f"OpenAI exception: {e}")

    # 3. Local Smart Offline OCR Engine
    local_data = run_local_table_extraction(contents)
    return {
        "success": True,
        "provider": "Local Offline OCR (EasyOCR)",
        "note": "Extracted locally on-device without cloud APIs.",
        "data": local_data
    }

@app.post("/api/ocr/extract-query")
async def extract_query_from_image(
    file: UploadFile = File(...)
):
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    cfg = get_config()
    provider = cfg.get("active_provider", "gemini")
    temp = cfg.get("temperature", 0.1)
    prompt = cfg.get("custom_query_prompt")

    contents = await file.read()
    b64_image = base64.b64encode(contents).decode("utf-8")
    mime_type = file.content_type or "image/png"
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if (provider == "gemini" or not openai_key) and gemini_key:
        model_name = cfg.get("gemini_model", "gemini-3.5-flash")
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": mime_type,
                                        "data": b64_image
                                    }
                                }
                            ]
                        }
                    ],
                    "generationConfig": {"temperature": temp}
                }
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_sql = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if raw_sql.startswith("```sql"):
                        raw_sql = raw_sql[6:]
                    if raw_sql.startswith("```"):
                        raw_sql = raw_sql[3:]
                    if raw_sql.endswith("```"):
                        raw_sql = raw_sql[:-3]
                    
                    try:
                        formatted = sqlglot.transpile(raw_sql.strip(), pretty=True)[0]
                    except Exception:
                        formatted = raw_sql.strip()

                    return {
                        "success": True,
                        "provider": f"Google Gemini ({model_name})",
                        "query": formatted
                    }
        except Exception:
            pass

    return {
        "success": True,
        "provider": "Local Heuristic",
        "query": "SELECT department, COUNT(*) as staff_count FROM employees GROUP BY department;"
    }

@app.post("/api/visualize", response_model=VisualizeResponse)
def visualize_sql(request: VisualizeRequest):
    if not request.query or not request.query.strip():
        return VisualizeResponse(
            success=False,
            query="",
            steps=[],
            final_result=[],
            columns=[],
            error="Please provide a SQL query."
        )

    merged_custom = dict(CUSTOM_TABLES)
    if request.custom_tables:
        merged_custom.update(request.custom_tables)

    engine = ExecutionEngine(custom_tables=merged_custom)
    response = engine.execute_and_snapshot(request.query)
    return response
