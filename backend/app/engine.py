import time
import json
import duckdb
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from sqlglot import exp
import sqlglot

from .models import (
    StepSnapshot, StepStats, GroupDetail, 
    VisualizeResponse, AstInfo
)
from .parser import ParsedSql
from .datasets import SAMPLE_DATASETS

# Distinct vibrant colors for group bucketing
GROUP_COLORS = [
    {"bg": "#1e293b", "border": "#38bdf8", "text": "#38bdf8", "name": "Cyan"},
    {"bg": "#1e293b", "border": "#a855f7", "text": "#c084fc", "name": "Purple"},
    {"bg": "#1e293b", "border": "#10b981", "text": "#34d399", "name": "Emerald"},
    {"bg": "#1e293b", "border": "#f59e0b", "text": "#fbbf24", "name": "Amber"},
    {"bg": "#1e293b", "border": "#ec4899", "text": "#f472b6", "name": "Pink"},
    {"bg": "#1e293b", "border": "#6366f1", "text": "#818cf8", "name": "Indigo"},
    {"bg": "#1e293b", "border": "#14b8a6", "text": "#2dd4bf", "name": "Teal"},
    {"bg": "#1e293b", "border": "#f97316", "text": "#fb923c", "name": "Orange"},
]

def sanitize_val(val: Any) -> Any:
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if np.isnan(val) or np.isinf(val):
            return None
        return round(float(val), 4)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    return str(val)

def sanitize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {k: sanitize_val(v) for k, v in row.items()}

class ExecutionEngine:
    def __init__(self, custom_tables: Optional[Dict[str, List[Dict[str, Any]]]] = None):
        self.con = duckdb.connect(database=":memory:")
        # Register standard sample tables
        for name, rows in SAMPLE_DATASETS.items():
            df = pd.DataFrame(rows)
            self.con.register(name, df)
        
        # Register custom tables if provided
        if custom_tables:
            for name, rows in custom_tables.items():
                if rows:
                    df = pd.DataFrame(rows)
                    self.con.register(name, df)

    def execute_and_snapshot(self, raw_query: str) -> VisualizeResponse:
        start_time = time.time()
        try:
            parsed = ParsedSql(raw_query)
        except Exception as e:
            return VisualizeResponse(
                success=False,
                query=raw_query,
                steps=[],
                final_result=[],
                columns=[],
                error=f"SQL Parse Error: {str(e)}"
            )

        steps: List[StepSnapshot] = []
        
        # We will follow the 10 logical processing steps
        try:
            # -------------------------------------------------------------
            # STEP 1: FROM / JOIN
            # -------------------------------------------------------------
            from_step, from_df = self._step_1_from_join(parsed)
            steps.append(from_step)
            current_df = from_df

            # -------------------------------------------------------------
            # STEP 2: WHERE
            # -------------------------------------------------------------
            where_step, where_df = self._step_2_where(parsed, current_df)
            steps.append(where_step)
            current_df = where_df

            # -------------------------------------------------------------
            # STEP 3: GROUP BY
            # -------------------------------------------------------------
            group_step, group_df, groups_meta = self._step_3_group_by(parsed, current_df)
            steps.append(group_step)
            current_df = group_df

            # -------------------------------------------------------------
            # STEP 4: AGGREGATE FUNCTIONS (SUM, COUNT, AVG, etc.)
            # -------------------------------------------------------------
            agg_step, agg_df, groups_meta = self._step_4_aggregates(parsed, current_df, groups_meta)
            steps.append(agg_step)
            current_df = agg_df

            # -------------------------------------------------------------
            # STEP 5: HAVING
            # -------------------------------------------------------------
            having_step, having_df = self._step_5_having(parsed, current_df, groups_meta)
            steps.append(having_step)
            current_df = having_df

            # -------------------------------------------------------------
            # STEP 6: WINDOW FUNCTIONS (OVER())
            # -------------------------------------------------------------
            win_step, win_df = self._step_6_window_functions(parsed, current_df)
            steps.append(win_step)
            current_df = win_df

            # -------------------------------------------------------------
            # STEP 7: SELECT
            # -------------------------------------------------------------
            select_step, select_df = self._step_7_select(parsed, current_df, groups_meta)
            steps.append(select_step)
            current_df = select_df

            # -------------------------------------------------------------
            # STEP 8: DISTINCT
            # -------------------------------------------------------------
            distinct_step, distinct_df = self._step_8_distinct(parsed, current_df)
            steps.append(distinct_step)
            current_df = distinct_df

            # -------------------------------------------------------------
            # STEP 9: ORDER BY
            # -------------------------------------------------------------
            order_step, order_df = self._step_9_order_by(parsed, current_df)
            steps.append(order_step)
            current_df = order_df

            # -------------------------------------------------------------
            # STEP 10: LIMIT / OFFSET
            # -------------------------------------------------------------
            limit_step, limit_df = self._step_10_limit(parsed, current_df)
            steps.append(limit_step)
            current_df = limit_df

            # Final clean result without internal __ fields
            clean_cols = [c for c in current_df.columns if not c.startswith("__")]
            final_rows = [sanitize_row({c: r[c] for c in clean_cols}) for _, r in current_df.iterrows()]

            elapsed_ms = (time.time() - start_time) * 1000.0

            return VisualizeResponse(
                success=True,
                query=raw_query,
                steps=steps,
                final_result=final_rows,
                columns=clean_cols,
                ast_info=parsed.ast_info,
                execution_time_ms=round(elapsed_ms, 2)
            )

        except Exception as e:
            return VisualizeResponse(
                success=False,
                query=raw_query,
                steps=steps,
                final_result=[],
                columns=[],
                ast_info=parsed.ast_info,
                error=f"Execution error at step {len(steps)+1}: {str(e)}"
            )

    # -------------------------------------------------------------------------
    # Step 1: FROM / JOIN
    # -------------------------------------------------------------------------
    def _step_1_from_join(self, parsed: ParsedSql) -> Tuple[StepSnapshot, pd.DataFrame]:
        from_clause = parsed.from_clause
        joins = parsed.joins

        from_sql = from_clause.sql() if from_clause else "FROM default"
        join_sqls = [j.sql() for j in joins]
        full_from_sql = f"{from_sql} {' '.join(join_sqls)}".strip()

        # Build SQL to get combined from/join table
        query = f"SELECT * {full_from_sql}"
        df = self.con.execute(query).df()
        
        # Add tracking row id and status
        df["__row_id"] = range(1, len(df) + 1)
        df["__status"] = "active"
        df["__eval"] = "Loaded from source"

        columns = [c for c in df.columns if not c.startswith("__")]
        rows = [sanitize_row(r.to_dict()) for _, r in df.iterrows()]

        tables_str = ", ".join(parsed.ast_info.tables) or "source"
        join_desc = f" with {len(joins)} JOIN(s)" if joins else ""
        desc = f"Identified and loaded {len(df)} initial raw records from {tables_str}{join_desc}."

        snapshot = StepSnapshot(
            step_number=1,
            step_id="from_join",
            clause_name="FROM / JOIN",
            clause_sql=full_from_sql,
            title="Identify Source Tables & Join Records",
            description=desc,
            concept_tip="SQL execution starts here. The database identifies the source tables and builds the working cross-product or joined dataset before evaluating any filters or aggregations.",
            columns=columns,
            rows=rows,
            stats=StepStats(
                total_rows=len(df),
                active_rows=len(df),
                passed_rows=len(df),
                filtered_rows=0
            ),
            is_active_in_query=True
        )
        return snapshot, df

    # -------------------------------------------------------------------------
    # Step 2: WHERE
    # -------------------------------------------------------------------------
    def _step_2_where(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame]:
        where_clause = parsed.where_clause
        if not where_clause:
            # Pass-through step
            snapshot = StepSnapshot(
                step_number=2,
                step_id="where",
                clause_name="WHERE",
                clause_sql="-- No WHERE clause specified",
                title="Filter Raw Rows (Skipped)",
                description="No WHERE filter specified. All rows pass through to the next stage unconditionally.",
                concept_tip="WHERE filters individual records BEFORE grouping or aggregation. (This is why aggregates like SUM() cannot appear in WHERE).",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        where_cond_sql = where_clause.this.sql()
        where_sql = f"WHERE {where_cond_sql}"

        # Evaluate condition for each row
        self.con.register("_temp_step1", df)
        try:
            eval_query = f"SELECT __row_id, ({where_cond_sql}) AS __eval_bool FROM _temp_step1"
            eval_df = self.con.execute(eval_query).df()
        except Exception as e:
            # Fallback if evaluation query fails
            eval_df = pd.DataFrame({"__row_id": df["__row_id"], "__eval_bool": True})

        merged = df.merge(eval_df, on="__row_id")
        
        passed_rows = 0
        filtered_rows = 0
        new_rows = []

        for _, r in merged.iterrows():
            row_dict = r.to_dict()
            is_pass = bool(row_dict.get("__eval_bool", False))
            if is_pass:
                passed_rows += 1
                row_dict["__status"] = "passed"
                row_dict["__eval"] = f"Condition matched: TRUE"
            else:
                filtered_rows += 1
                row_dict["__status"] = "filtered"
                row_dict["__eval"] = f"Condition failed: FALSE"
            new_rows.append(sanitize_row(row_dict))

        # Filtered working dataframe for subsequent steps
        active_df = merged[merged["__eval_bool"] == True].copy()
        active_df.drop(columns=["__eval_bool"], inplace=True, errors="ignore")
        active_df["__status"] = "active"

        snapshot = StepSnapshot(
            step_number=2,
            step_id="where",
            clause_name="WHERE",
            clause_sql=where_sql,
            title="Filter Individual Raw Rows",
            description=f"Evaluated predicate ({where_cond_sql}). {passed_rows} row(s) passed, {filtered_rows} row(s) filtered out.",
            concept_tip="WHERE evaluates expressions row-by-row before any grouping occurs. Only matching rows advance to GROUP BY and aggregations.",
            columns=[c for c in df.columns if not c.startswith("__")],
            rows=new_rows,
            stats=StepStats(
                total_rows=len(df),
                active_rows=passed_rows,
                passed_rows=passed_rows,
                filtered_rows=filtered_rows
            ),
            is_active_in_query=True
        )
        return snapshot, active_df

    # -------------------------------------------------------------------------
    # Step 3: GROUP BY
    # -------------------------------------------------------------------------
    def _step_3_group_by(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame, Optional[Dict[str, Any]]]:
        group_clause = parsed.group_clause
        if not group_clause:
            snapshot = StepSnapshot(
                step_number=3,
                step_id="group_by",
                clause_name="GROUP BY",
                clause_sql="-- No GROUP BY clause specified",
                title="Collapse into Summary Buckets (Skipped)",
                description="No GROUP BY grouping specified. Dataset remains as individual records.",
                concept_tip="GROUP BY partitions records sharing identical grouping keys into discrete buckets for aggregate calculations.",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0,
                    group_count=0
                ),
                is_active_in_query=False
            )
            return snapshot, df, None

        group_exprs = [e.sql() for e in group_clause.expressions]
        group_sql = f"GROUP BY {', '.join(group_exprs)}"

        # Compute group assignments
        group_keys = group_exprs
        
        # Partition rows in df
        # Create group tags
        group_dict: Dict[str, Dict[str, Any]] = {}
        assigned_rows = []
        color_idx = 0

        # We can use pandas groupby
        existing_cols = [c for c in group_keys if c in df.columns]
        if not existing_cols:
            existing_cols = [df.columns[0]] # fallback

        for _, r in df.iterrows():
            row_dict = r.to_dict()
            key_val = " - ".join(str(row_dict.get(c, "")) for c in existing_cols)
            
            if key_val not in group_dict:
                g_id = f"g-{color_idx + 1}"
                color_meta = GROUP_COLORS[color_idx % len(GROUP_COLORS)]
                group_dict[key_val] = {
                    "group_id": g_id,
                    "group_key": key_val,
                    "group_values": {c: row_dict.get(c) for c in existing_cols},
                    "color": color_meta,
                    "rows": [],
                    "row_count": 0,
                    "status": "passed"
                }
                color_idx += 1

            g_meta = group_dict[key_val]
            g_meta["rows"].append(sanitize_row(row_dict))
            g_meta["row_count"] += 1

            row_dict["__group_id"] = g_meta["group_id"]
            row_dict["__group_key"] = key_val
            row_dict["__group_color"] = g_meta["color"]["border"]
            row_dict["__status"] = "active"
            row_dict["__eval"] = f"Bucket: {key_val}"
            assigned_rows.append(sanitize_row(row_dict))

        tagged_df = pd.DataFrame(assigned_rows)

        groups_list = []
        for k, g in group_dict.items():
            groups_list.append(GroupDetail(
                group_id=g["group_id"],
                group_key=g["group_key"],
                group_values=g["group_values"],
                row_count=g["row_count"],
                rows=g["rows"],
                status="passed"
            ))

        desc = f"Grouped {len(df)} active row(s) into {len(groups_list)} distinct bucket(s) based on {', '.join(group_keys)}."

        snapshot = StepSnapshot(
            step_number=3,
            step_id="group_by",
            clause_name="GROUP BY",
            clause_sql=group_sql,
            title="Collapse Rows into Summary Buckets",
            description=desc,
            concept_tip="GROUP BY collapses rows into unique buckets based on the grouping keys. Each bucket will produce one aggregate output row.",
            columns=[c for c in tagged_df.columns if not c.startswith("__")],
            rows=assigned_rows,
            groups=groups_list,
            stats=StepStats(
                total_rows=len(df),
                active_rows=len(df),
                passed_rows=len(df),
                filtered_rows=0,
                group_count=len(groups_list)
            ),
            is_active_in_query=True
        )

        meta = {
            "group_keys": existing_cols,
            "group_dict": group_dict,
            "groups_list": groups_list
        }

        return snapshot, tagged_df, meta

    # -------------------------------------------------------------------------
    # Step 4: AGGREGATE FUNCTIONS
    # -------------------------------------------------------------------------
    def _step_4_aggregates(self, parsed: ParsedSql, df: pd.DataFrame, groups_meta: Optional[Dict[str, Any]]) -> Tuple[StepSnapshot, pd.DataFrame, Optional[Dict[str, Any]]]:
        aggregates = parsed.ast_info.aggregates_used
        if not aggregates and not groups_meta:
            snapshot = StepSnapshot(
                step_number=4,
                step_id="aggregates",
                clause_name="AGGREGATE FUNCTIONS",
                clause_sql="-- No Aggregate Functions (SUM, COUNT, AVG, etc.)",
                title="Calculate Aggregates (Skipped)",
                description="No aggregate functions found. Record values remain non-aggregated.",
                concept_tip="Aggregate functions (COUNT, SUM, AVG, MIN, MAX) compute summary metrics for each grouped bucket.",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0,
                    group_count=0
                ),
                is_active_in_query=False
            )
            return snapshot, df, groups_meta

        # Calculate aggregate metrics per group or for entire table
        agg_descriptions = []
        self.con.register("_temp_step3", df)
        
        # Build aggregation query
        if groups_meta:
            g_keys = groups_meta["group_keys"]
            g_keys_sql = ", ".join(g_keys)
            agg_items_sql = ", ".join(aggregates) if aggregates else "COUNT(*) AS count"
            agg_query = f"SELECT {g_keys_sql}, {agg_items_sql} FROM _temp_step3 GROUP BY {g_keys_sql}"
            try:
                agg_res_df = self.con.execute(agg_query).df()
                # Attach computed aggregates into groups_meta
                for _, r in agg_res_df.iterrows():
                    key_val = " - ".join(str(r.get(c, "")) for c in g_keys)
                    if key_val in groups_meta["group_dict"]:
                        computed = {k: sanitize_val(v) for k, v in r.items() if k not in g_keys}
                        groups_meta["group_dict"][key_val]["aggregates"] = computed
                
                # Refresh groups_list
                groups_meta["groups_list"] = [
                    GroupDetail(
                        group_id=g["group_id"],
                        group_key=g["group_key"],
                        group_values=g["group_values"],
                        row_count=g["row_count"],
                        rows=g["rows"],
                        aggregates=g.get("aggregates", {}),
                        status=g.get("status", "passed")
                    )
                    for g in groups_meta["group_dict"].values()
                ]
            except Exception as e:
                pass
        
        agg_list_str = ", ".join(aggregates) if aggregates else "COUNT(*)"
        desc = f"Calculated aggregate functions [{agg_list_str}] across {len(groups_meta['groups_list']) if groups_meta else 1} bucket(s)."

        snapshot = StepSnapshot(
            step_number=4,
            step_id="aggregates",
            clause_name="AGGREGATE FUNCTIONS",
            clause_sql=f"Calculated: {agg_list_str}",
            title="Calculate Single Aggregated Values for Each Bucket",
            description=desc,
            concept_tip="Aggregate functions compute summary scalars (like SUM, COUNT, AVG) for each bucket established in GROUP BY.",
            columns=[c for c in df.columns if not c.startswith("__")],
            rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
            groups=groups_meta["groups_list"] if groups_meta else None,
            stats=StepStats(
                total_rows=len(df),
                active_rows=len(df),
                passed_rows=len(df),
                filtered_rows=0,
                group_count=len(groups_meta["groups_list"]) if groups_meta else 0
            ),
            is_active_in_query=True
        )
        return snapshot, df, groups_meta

    # -------------------------------------------------------------------------
    # Step 5: HAVING
    # -------------------------------------------------------------------------
    def _step_5_having(self, parsed: ParsedSql, df: pd.DataFrame, groups_meta: Optional[Dict[str, Any]]) -> Tuple[StepSnapshot, pd.DataFrame]:
        having_clause = parsed.having_clause
        if not having_clause:
            snapshot = StepSnapshot(
                step_number=5,
                step_id="having",
                clause_name="HAVING",
                clause_sql="-- No HAVING clause specified",
                title="Filter Summary Groups (Skipped)",
                description="No HAVING filter specified. All groups pass through unconditionally.",
                concept_tip="HAVING filters whole summary groups based on aggregate results (e.g. HAVING COUNT(*) > 1).",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                groups=groups_meta["groups_list"] if groups_meta else None,
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0,
                    group_count=len(groups_meta["groups_list"]) if groups_meta else 0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        having_cond_sql = having_clause.this.sql()
        having_sql = f"HAVING {having_cond_sql}"

        self.con.register("_temp_step4", df)

        # Check groups filtering
        passed_group_keys = set()
        if groups_meta:
            g_keys = groups_meta["group_keys"]
            g_keys_sql = ", ".join(g_keys)
            having_query = f"SELECT {g_keys_sql}, ({having_cond_sql}) AS __having_pass FROM _temp_step4 GROUP BY {g_keys_sql} HAVING {having_cond_sql}"
            try:
                having_res = self.con.execute(having_query).df()
                for _, r in having_res.iterrows():
                    k_val = " - ".join(str(r.get(c, "")) for c in g_keys)
                    passed_group_keys.add(k_val)
            except Exception:
                # If direct having fails, try without having wrapper
                pass

        annotated_rows = []
        passed_count = 0
        filtered_count = 0

        for _, r in df.iterrows():
            row_dict = r.to_dict()
            g_key = row_dict.get("__group_key")
            is_pass = g_key in passed_group_keys if groups_meta else True
            if is_pass:
                passed_count += 1
                row_dict["__status"] = "passed"
                row_dict["__eval"] = f"Group '{g_key}' satisfied HAVING: {having_cond_sql}"
            else:
                filtered_count += 1
                row_dict["__status"] = "filtered"
                row_dict["__eval"] = f"Group '{g_key}' filtered out by HAVING: {having_cond_sql}"
            annotated_rows.append(sanitize_row(row_dict))

        # Update groups status in groups_meta
        if groups_meta:
            for g in groups_meta["groups_list"]:
                if g.group_key in passed_group_keys:
                    g.status = "passed"
                    g.eval_detail = f"Group passed HAVING ({having_cond_sql})"
                else:
                    g.status = "filtered"
                    g.eval_detail = f"Group filtered out by HAVING ({having_cond_sql})"

        # Working df only keeps passing rows
        passed_df = df[df["__group_key"].isin(passed_group_keys)].copy() if groups_meta else df

        snapshot = StepSnapshot(
            step_number=5,
            step_id="having",
            clause_name="HAVING",
            clause_sql=having_sql,
            title="Filter Summary Groups by Aggregate Conditions",
            description=f"Evaluated group filter ({having_cond_sql}). {len(passed_group_keys)} group(s) passed, {len(groups_meta['groups_list']) - len(passed_group_keys) if groups_meta else 0} group(s) filtered out.",
            concept_tip="HAVING filters entire summary groups based on aggregate results (unlike WHERE which filters individual rows beforehand).",
            columns=[c for c in df.columns if not c.startswith("__")],
            rows=annotated_rows,
            groups=groups_meta["groups_list"] if groups_meta else None,
            stats=StepStats(
                total_rows=len(df),
                active_rows=passed_count,
                passed_rows=passed_count,
                filtered_rows=filtered_count,
                group_count=len(passed_group_keys)
            ),
            is_active_in_query=True
        )
        return snapshot, passed_df

    # -------------------------------------------------------------------------
    # Step 6: WINDOW FUNCTIONS (OVER())
    # -------------------------------------------------------------------------
    def _step_6_window_functions(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame]:
        windows = parsed.ast_info.window_funcs_used
        if not windows:
            snapshot = StepSnapshot(
                step_number=6,
                step_id="windows",
                clause_name="WINDOW FUNCTIONS",
                clause_sql="-- No Window Functions OVER() specified",
                title="Execute Window Functions (Skipped)",
                description="No window functions specified. Records proceed to SELECT projection.",
                concept_tip="Window functions (OVER()) execute rankings, rolling averages, and offsets across the post-filtered dataset without collapsing rows.",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        # Execute window functions
        self.con.register("_temp_step5", df)
        win_selects = ", ".join(windows)
        win_query = f"SELECT *, {win_selects} FROM _temp_step5"
        try:
            win_df = self.con.execute(win_query).df()
        except Exception:
            win_df = df

        columns = [c for c in win_df.columns if not c.startswith("__")]
        rows = [sanitize_row(r.to_dict()) for _, r in win_df.iterrows()]

        snapshot = StepSnapshot(
            step_number=6,
            step_id="windows",
            clause_name="WINDOW FUNCTIONS",
            clause_sql=f"OVER(): {', '.join(windows)}",
            title="Execute Window Functions (OVER())",
            description=f"Calculated {len(windows)} window function expression(s) across partitions.",
            concept_tip="Window functions calculate metrics across row sets/partitions without collapsing them into single rows.",
            columns=columns,
            rows=rows,
            stats=StepStats(
                total_rows=len(win_df),
                active_rows=len(win_df),
                passed_rows=len(win_df),
                filtered_rows=0
            ),
            is_active_in_query=True
        )
        return snapshot, win_df

    # -------------------------------------------------------------------------
    # Step 7: SELECT
    # -------------------------------------------------------------------------
    def _step_7_select(self, parsed: ParsedSql, df: pd.DataFrame, groups_meta: Optional[Dict[str, Any]]) -> Tuple[StepSnapshot, pd.DataFrame]:
        select_exprs = [s.sql() for s in parsed.select_expressions]
        select_sql = f"SELECT {', '.join(select_exprs)}"

        self.con.register("_temp_step6", df)
        
        # If query has group by, apply SELECT on the grouped data
        if parsed.group_clause:
            g_keys = [e.sql() for e in parsed.group_clause.expressions]
            g_keys_sql = ", ".join(g_keys)
            query = f"SELECT {', '.join(select_exprs)} FROM _temp_step6 GROUP BY {g_keys_sql}"
        else:
            query = f"SELECT {', '.join(select_exprs)} FROM _temp_step6"

        try:
            proj_df = self.con.execute(query).df()
        except Exception as e:
            # Fallback direct projection
            proj_df = df

        proj_df["__row_id"] = range(1, len(proj_df) + 1)
        proj_df["__status"] = "active"
        proj_df["__eval"] = "Projected column list"

        columns = [c for c in proj_df.columns if not c.startswith("__")]
        rows = [sanitize_row(r.to_dict()) for _, r in proj_df.iterrows()]

        desc = f"Projected and computed {len(columns)} column(s) ({', '.join(columns)})."

        snapshot = StepSnapshot(
            step_number=7,
            step_id="select",
            clause_name="SELECT",
            clause_sql=select_sql,
            title="Evaluate Column Expressions & Aliases",
            description=desc,
            concept_tip="SELECT projects the specified columns, computes mathematical expressions, and binds column aliases.",
            columns=columns,
            rows=rows,
            stats=StepStats(
                total_rows=len(proj_df),
                active_rows=len(proj_df),
                passed_rows=len(proj_df),
                filtered_rows=0
            ),
            is_active_in_query=True
        )
        return snapshot, proj_df

    # -------------------------------------------------------------------------
    # Step 8: DISTINCT
    # -------------------------------------------------------------------------
    def _step_8_distinct(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame]:
        has_distinct = parsed.distinct is not None
        if not has_distinct:
            snapshot = StepSnapshot(
                step_number=8,
                step_id="distinct",
                clause_name="DISTINCT",
                clause_sql="-- No DISTINCT clause specified",
                title="Deduplicate Output Rows (Skipped)",
                description="No DISTINCT modifier specified. Duplicate rows are preserved.",
                concept_tip="DISTINCT inspects the projected SELECT columns and filters out duplicate rows.",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        clean_cols = [c for c in df.columns if not c.startswith("__")]
        
        # Deduplicate
        seen = set()
        annotated_rows = []
        kept_rows = []
        dup_count = 0

        for _, r in df.iterrows():
            row_dict = r.to_dict()
            row_tuple = tuple(sanitize_val(row_dict.get(c)) for c in clean_cols)
            if row_tuple in seen:
                dup_count += 1
                row_dict["__status"] = "duplicate"
                row_dict["__eval"] = "Duplicate row removed by DISTINCT"
            else:
                seen.add(row_tuple)
                row_dict["__status"] = "passed"
                row_dict["__eval"] = "Unique row retained"
                kept_rows.append(row_dict)
            annotated_rows.append(sanitize_row(row_dict))

        distinct_df = pd.DataFrame(kept_rows) if kept_rows else df

        snapshot = StepSnapshot(
            step_number=8,
            step_id="distinct",
            clause_name="DISTINCT",
            clause_sql="SELECT DISTINCT ...",
            title="Deduplicate Projected Rows",
            description=f"Scanned output rows: retained {len(seen)} unique record(s), removed {dup_count} duplicate row(s).",
            concept_tip="DISTINCT scans the final projected SELECT list and removes duplicate rows.",
            columns=clean_cols,
            rows=annotated_rows,
            stats=StepStats(
                total_rows=len(df),
                active_rows=len(seen),
                passed_rows=len(seen),
                filtered_rows=dup_count
            ),
            is_active_in_query=True
        )
        return snapshot, distinct_df

    # -------------------------------------------------------------------------
    # Step 9: ORDER BY
    # -------------------------------------------------------------------------
    def _step_9_order_by(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame]:
        order_clause = parsed.order_clause
        if not order_clause:
            snapshot = StepSnapshot(
                step_number=9,
                step_id="order_by",
                clause_name="ORDER BY",
                clause_sql="-- No ORDER BY clause specified",
                title="Sort Result Set (Skipped)",
                description="No ORDER BY sort criteria specified. Rows maintain natural order.",
                concept_tip="ORDER BY sorts the final deduplicated result set hierarchically (ASC or DESC).",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        order_exprs = [e.sql() for e in order_clause.expressions]
        order_sql = f"ORDER BY {', '.join(order_exprs)}"

        self.con.register("_temp_step8", df)
        query = f"SELECT * FROM _temp_step8 {order_sql}"
        try:
            sorted_df = self.con.execute(query).df()
        except Exception:
            sorted_df = df

        columns = [c for c in sorted_df.columns if not c.startswith("__")]
        
        annotated_rows = []
        for idx, (_, r) in enumerate(sorted_df.iterrows(), start=1):
            row_dict = r.to_dict()
            row_dict["__status"] = "passed"
            row_dict["__eval"] = f"Sorted position #{idx}"
            annotated_rows.append(sanitize_row(row_dict))

        snapshot = StepSnapshot(
            step_number=9,
            step_id="order_by",
            clause_name="ORDER BY",
            clause_sql=order_sql,
            title="Sort Result Set Hierarchically",
            description=f"Sorted {len(sorted_df)} row(s) by {', '.join(order_exprs)}.",
            concept_tip="ORDER BY orders the final dataset. It runs almost last because sorting requires the full projected result set.",
            columns=columns,
            rows=annotated_rows,
            stats=StepStats(
                total_rows=len(sorted_df),
                active_rows=len(sorted_df),
                passed_rows=len(sorted_df),
                filtered_rows=0
            ),
            is_active_in_query=True
        )
        return snapshot, sorted_df

    # -------------------------------------------------------------------------
    # Step 10: LIMIT / OFFSET
    # -------------------------------------------------------------------------
    def _step_10_limit(self, parsed: ParsedSql, df: pd.DataFrame) -> Tuple[StepSnapshot, pd.DataFrame]:
        limit_clause = parsed.limit_clause
        offset_clause = parsed.offset_clause

        if not limit_clause and not offset_clause:
            snapshot = StepSnapshot(
                step_number=10,
                step_id="limit",
                clause_name="LIMIT / OFFSET",
                clause_sql="-- No LIMIT / OFFSET specified",
                title="Trim Output Rows (Skipped)",
                description="No LIMIT or OFFSET specified. Full result set returned.",
                concept_tip="LIMIT / OFFSET slices the final sorted result set to return a specific row window or page count.",
                columns=[c for c in df.columns if not c.startswith("__")],
                rows=[sanitize_row(r.to_dict()) for _, r in df.iterrows()],
                stats=StepStats(
                    total_rows=len(df),
                    active_rows=len(df),
                    passed_rows=len(df),
                    filtered_rows=0
                ),
                is_active_in_query=False
            )
            return snapshot, df

        limit_val = int(limit_clause.expression.sql()) if limit_clause else len(df)
        offset_val = int(offset_clause.expression.sql()) if offset_clause else 0

        limit_sql = f"LIMIT {limit_val}" + (f" OFFSET {offset_val}" if offset_val else "")

        annotated_rows = []
        kept_rows = []
        
        for idx, (_, r) in enumerate(df.iterrows()):
            row_dict = r.to_dict()
            if offset_val <= idx < (offset_val + limit_val):
                row_dict["__status"] = "passed"
                row_dict["__eval"] = f"Within LIMIT window (row #{idx+1})"
                kept_rows.append(row_dict)
            else:
                row_dict["__status"] = "truncated"
                row_dict["__eval"] = f"Truncated by LIMIT {limit_val} / OFFSET {offset_val}"
            annotated_rows.append(sanitize_row(row_dict))

        trimmed_df = pd.DataFrame(kept_rows) if kept_rows else df.iloc[offset_val : offset_val + limit_val]

        columns = [c for c in df.columns if not c.startswith("__")]

        snapshot = StepSnapshot(
            step_number=10,
            step_id="limit",
            clause_name="LIMIT / OFFSET",
            clause_sql=limit_sql,
            title="Trim Output to Specified Window",
            description=f"Trimmed output to {len(kept_rows)} row(s) (Offset: {offset_val}, Limit: {limit_val}).",
            concept_tip="LIMIT / OFFSET is the final operation in logical SQL processing, truncating the stream to the requested page size.",
            columns=columns,
            rows=annotated_rows,
            stats=StepStats(
                total_rows=len(df),
                active_rows=len(kept_rows),
                passed_rows=len(kept_rows),
                filtered_rows=len(df) - len(kept_rows)
            ),
            is_active_in_query=True
        )
        return snapshot, trimmed_df
