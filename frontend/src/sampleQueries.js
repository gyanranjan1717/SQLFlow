export const DEFAULT_PRESETS = [
  {
    id: "ex-dept-high-earners",
    title: "1. High Earners by Department",
    description: "WHERE filtering -> GROUP BY bucketing -> HAVING group filter -> ORDER BY sorting.",
    level: "Intermediate",
    dataset: "employees",
    query: `SELECT 
    department, 
    COUNT(*) AS num_staff, 
    AVG(salary) AS avg_salary, 
    MAX(salary) AS peak_salary
FROM employees
WHERE salary >= 60000
GROUP BY department
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC;`,
    highlight_steps: ["where", "group_by", "aggregates", "having", "select", "order_by"]
  },
  {
    id: "ex-revenue-by-category",
    title: "2. Revenue by Category",
    description: "Filters completed orders, groups by category, sums order values.",
    level: "Beginner",
    dataset: "orders",
    query: `SELECT 
    category,
    COUNT(*) AS total_orders,
    SUM(quantity * unit_price) AS total_revenue
FROM orders
WHERE status = 'Completed'
GROUP BY category
ORDER BY total_revenue DESC;`,
    highlight_steps: ["where", "group_by", "aggregates", "select", "order_by"]
  },
  {
    id: "ex-window-salary-rank",
    title: "3. Window Function: Salary Ranks",
    description: "Calculates department rank and department average using OVER().",
    level: "Advanced",
    dataset: "employees",
    query: `SELECT 
    name, 
    department, 
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank,
    AVG(salary) OVER (PARTITION BY department) as dept_avg
FROM employees
WHERE experience >= 3
ORDER BY department, salary DESC;`,
    highlight_steps: ["where", "windows", "select", "order_by"]
  },
  {
    id: "ex-distinct-majors",
    title: "4. Distinct High GPA Majors",
    description: "WHERE condition, SELECT projection, DISTINCT deduplication.",
    level: "Beginner",
    dataset: "students",
    query: `SELECT DISTINCT 
    major, 
    year
FROM students
WHERE gpa > 3.5
ORDER BY major, year;`,
    highlight_steps: ["where", "select", "distinct", "order_by"]
  },
  {
    id: "ex-top-earners-limit",
    title: "5. Top 4 Highly Rated Staff",
    description: "WHERE filter, ORDER BY sorting, and LIMIT trimming.",
    level: "Beginner",
    dataset: "employees",
    query: `SELECT 
    name, 
    department, 
    role, 
    salary
FROM employees
WHERE rating >= 4.0
ORDER BY salary DESC
LIMIT 4;`,
    highlight_steps: ["where", "select", "order_by", "limit"]
  },
  {
    id: "ex-join-dept-budget",
    title: "6. JOIN with Department Budgets",
    description: "Performs an INNER JOIN between employees and departments.",
    level: "Intermediate",
    dataset: "employees",
    query: `SELECT 
    e.name, 
    e.department, 
    e.salary, 
    d.annual_budget
FROM employees e
JOIN departments d ON e.department = d.dept_name
WHERE e.salary > 70000
ORDER BY e.salary DESC;`,
    highlight_steps: ["from_join", "where", "select", "order_by"]
  }
];

export const STEP_CONFIGS = {
  from_join: {
    number: 1,
    name: "FROM / JOIN",
    icon: "Database",
    color: "#38bdf8",
    badgeClass: "step-badge-from",
    summary: "Identifies source tables, loads raw records, and joins datasets together."
  },
  where: {
    number: 2,
    name: "WHERE",
    icon: "Filter",
    color: "#fbbf24",
    badgeClass: "step-badge-where",
    summary: "Filters individual raw rows before any grouping or aggregation happens."
  },
  group_by: {
    number: 3,
    name: "GROUP BY",
    icon: "Boxes",
    color: "#c084fc",
    badgeClass: "step-badge-group",
    summary: "Collapses remaining rows into unique summary buckets based on specified columns."
  },
  aggregates: {
    number: 4,
    name: "Aggregates",
    icon: "Calculator",
    color: "#f472b6",
    badgeClass: "step-badge-agg",
    summary: "Calculates single aggregated values (SUM, COUNT, AVG, etc.) for each bucket."
  },
  having: {
    number: 5,
    name: "HAVING",
    icon: "FilterX",
    color: "#fb923c",
    badgeClass: "step-badge-having",
    summary: "Filters out entire summary groups based on aggregate results."
  },
  windows: {
    number: 6,
    name: "Window OVER()",
    icon: "Layers",
    color: "#818cf8",
    badgeClass: "step-badge-window",
    summary: "Executes ranking, rolling averages, and offsets across dataset without collapsing."
  },
  select: {
    number: 7,
    name: "SELECT",
    icon: "Columns",
    color: "#34d399",
    badgeClass: "step-badge-select",
    summary: "Evaluates column expressions, computes math formulas, and sets column aliases."
  },
  distinct: {
    number: 8,
    name: "DISTINCT",
    icon: "CopyCheck",
    color: "#facc15",
    badgeClass: "step-badge-distinct",
    summary: "Scans projected SELECT list and removes duplicate rows."
  },
  order_by: {
    number: 9,
    name: "ORDER BY",
    icon: "ArrowUpDown",
    color: "#60a5fa",
    badgeClass: "step-badge-order",
    summary: "Sorts the final deduplicated result set hierarchically."
  },
  limit: {
    number: 10,
    name: "LIMIT / OFFSET",
    icon: "Scissors",
    color: "#fb7185",
    badgeClass: "step-badge-limit",
    summary: "Trims the output to return only the specified row count."
  }
};
