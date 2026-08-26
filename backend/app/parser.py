import sqlglot
from sqlglot import exp
from typing import Dict, List, Any, Optional
from .models import AstInfo

class ParsedSql:
    def __init__(self, raw_query: str):
        self.raw_query = raw_query.strip()
        # Parse expression
        try:
            self.expression = sqlglot.parse_one(self.raw_query, read="duckdb")
        except Exception:
            try:
                self.expression = sqlglot.parse_one(self.raw_query)
            except Exception as e:
                raise ValueError(f"SQL Syntax Error: {str(e)}")

        if not isinstance(self.expression, exp.Select):
            select = self.expression.find(exp.Select)
            if not select:
                raise ValueError("Only SELECT queries are supported in the visualizer.")
            self.expression = select

        self.ctes: List[Tuple[str, str]] = []
        for cte in self.expression.find_all(exp.CTE):
            alias = cte.alias
            sql_str = cte.this.sql()
            if alias:
                self.ctes.append((alias, sql_str))

        self.ast_info = self._extract_ast_info()

    def _extract_ast_info(self) -> AstInfo:
        cte_names = [alias for alias, _ in self.ctes]
        has_cte = len(cte_names) > 0

        all_tables = [t.name for t in self.expression.find_all(exp.Table)]
        tables = [t for t in all_tables if t not in cte_names]
        
        has_where = self.expression.find(exp.Where) is not None
        has_group_by = self.expression.find(exp.Group) is not None
        has_having = self.expression.find(exp.Having) is not None
        has_distinct = self.expression.find(exp.Distinct) is not None
        has_order_by = self.expression.find(exp.Order) is not None
        has_limit = self.expression.find(exp.Limit) is not None

        aggregates = []
        for agg in self.expression.find_all(exp.AggFunc):
            aggregates.append(agg.sql())

        windows = []
        for win in self.expression.find_all(exp.Window):
            windows.append(win.sql())
        has_window = len(windows) > 0

        return AstInfo(
            tables=list(dict.fromkeys(tables)),
            has_where=has_where,
            has_group_by=has_group_by,
            has_having=has_having,
            has_window=has_window,
            has_distinct=has_distinct,
            has_order_by=has_order_by,
            has_limit=has_limit,
            has_cte=has_cte,
            cte_names=cte_names,
            aggregates_used=aggregates,
            window_funcs_used=windows
        )

    @property
    def from_clause(self) -> Optional[exp.From]:
        return self.expression.find(exp.From)

    @property
    def joins(self) -> List[exp.Join]:
        return list(self.expression.find_all(exp.Join))

    @property
    def where_clause(self) -> Optional[exp.Where]:
        return self.expression.find(exp.Where)

    @property
    def group_clause(self) -> Optional[exp.Group]:
        return self.expression.find(exp.Group)

    @property
    def having_clause(self) -> Optional[exp.Having]:
        return self.expression.find(exp.Having)

    @property
    def select_expressions(self) -> List[exp.Expression]:
        return self.expression.selects

    @property
    def distinct(self) -> Optional[exp.Distinct]:
        return self.expression.find(exp.Distinct)

    @property
    def order_clause(self) -> Optional[exp.Order]:
        return self.expression.find(exp.Order)

    @property
    def limit_clause(self) -> Optional[exp.Limit]:
        return self.expression.find(exp.Limit)

    @property
    def offset_clause(self) -> Optional[exp.Offset]:
        return self.expression.find(exp.Offset)
