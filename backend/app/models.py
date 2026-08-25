from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class RowData(BaseModel):
    data: Dict[str, Any]
    status: str = "active"  # "active", "passed", "filtered", "duplicate", "truncated"
    eval_detail: Optional[str] = None
    group_id: Optional[str] = None
    group_key: Optional[str] = None
    row_id: int

class StepStats(BaseModel):
    total_rows: int
    active_rows: int
    passed_rows: int = 0
    filtered_rows: int = 0
    group_count: int = 0

class GroupDetail(BaseModel):
    group_id: str
    group_key: str
    group_values: Dict[str, Any]
    row_count: int
    rows: List[Dict[str, Any]]
    aggregates: Dict[str, Any] = Field(default_factory=dict)
    status: str = "passed"  # "passed" or "filtered"
    eval_detail: Optional[str] = None

class StepSnapshot(BaseModel):
    step_number: int          # 1 to 10
    step_id: str              # "from_join", "where", "group_by", "aggregates", "having", "windows", "select", "distinct", "order_by", "limit"
    clause_name: str          # "FROM / JOIN", "WHERE", "GROUP BY", "AGGREGATE FUNCTIONS", "HAVING", "WINDOW FUNCTIONS", "SELECT", "DISTINCT", "ORDER BY", "LIMIT / OFFSET"
    clause_sql: str           # e.g., "WHERE salary > 50000"
    title: str                # e.g., "Row Filtering"
    description: str          # Explanation of what happened
    concept_tip: str          # Pedagogical explanation of why SQL executes in this order
    columns: List[str]        # Visible column list
    rows: List[Dict[str, Any]]# Row records with metadata prefixes (__status, __eval, __group_id, __row_id, etc.)
    stats: StepStats
    groups: Optional[List[GroupDetail]] = None
    is_active_in_query: bool = True  # True if this clause was actually written in the user's query

class AstInfo(BaseModel):
    tables: List[str] = Field(default_factory=list)
    has_where: bool = False
    has_group_by: bool = False
    has_having: bool = False
    has_window: bool = False
    has_distinct: bool = False
    has_order_by: bool = False
    has_limit: bool = False
    aggregates_used: List[str] = Field(default_factory=list)
    window_funcs_used: List[str] = Field(default_factory=list)

class VisualizeRequest(BaseModel):
    query: str
    dataset_name: Optional[str] = "employees"
    custom_tables: Optional[Dict[str, List[Dict[str, Any]]]] = None

class VisualizeResponse(BaseModel):
    success: bool
    query: str
    steps: List[StepSnapshot]
    final_result: List[Dict[str, Any]]
    columns: List[str]
    ast_info: Optional[AstInfo] = None
    execution_time_ms: float = 0.0
    error: Optional[str] = None

class TableSchema(BaseModel):
    table_name: str
    description: str
    row_count: int
    columns: List[Dict[str, str]] # {"name": "salary", "type": "INTEGER"}
    sample_rows: List[Dict[str, Any]]

class ExampleQuery(BaseModel):
    id: str
    title: str
    description: str
    level: str  # "Beginner", "Intermediate", "Advanced"
    dataset: str
    query: str
    highlight_steps: List[str]
