from typing import Dict, List, Any
from .models import TableSchema, ExampleQuery

SAMPLE_DATASETS: Dict[str, List[Dict[str, Any]]] = {
    "employees": [
        {"emp_id": 101, "name": "Alice Johnson", "department": "Engineering", "role": "Senior Dev", "salary": 95000, "experience": 6, "rating": 4.8},
        {"emp_id": 102, "name": "Bob Smith", "department": "Marketing", "role": "Specialist", "salary": 48000, "experience": 2, "rating": 3.9},
        {"emp_id": 103, "name": "Charlie Lee", "department": "Engineering", "role": "Lead Architect", "salary": 125000, "experience": 9, "rating": 4.9},
        {"emp_id": 104, "name": "Diana Prince", "department": "Sales", "role": "Account Exec", "salary": 68000, "experience": 4, "rating": 4.2},
        {"emp_id": 105, "name": "Evan Wright", "department": "Engineering", "role": "Junior Dev", "salary": 62000, "experience": 1, "rating": 4.0},
        {"emp_id": 106, "name": "Fiona Gallagher", "department": "Marketing", "role": "Manager", "salary": 88000, "experience": 7, "rating": 4.6},
        {"emp_id": 107, "name": "George Clark", "department": "Sales", "role": "Senior Rep", "salary": 72000, "experience": 5, "rating": 4.1},
        {"emp_id": 108, "name": "Hannah Abbott", "department": "Finance", "role": "Analyst", "salary": 59000, "experience": 3, "rating": 3.8},
        {"emp_id": 109, "name": "Ian Malcolm", "department": "Finance", "role": "Director", "salary": 115000, "experience": 10, "rating": 4.7},
        {"emp_id": 110, "name": "Julia Roberts", "department": "Sales", "role": "Associate", "salary": 45000, "experience": 1, "rating": 3.5}
    ],
    "orders": [
        {"order_id": 501, "customer": "Acme Corp", "category": "Electronics", "item": "Monitor 4K", "quantity": 5, "unit_price": 320.0, "status": "Completed"},
        {"order_id": 502, "customer": "Globex Inc", "category": "Furniture", "item": "Ergo Chair", "quantity": 12, "unit_price": 250.0, "status": "Completed"},
        {"order_id": 503, "customer": "Initech", "category": "Electronics", "item": "Mechanical Keyboard", "quantity": 8, "unit_price": 95.0, "status": "Pending"},
        {"order_id": 504, "customer": "Umbrella Corp", "category": "Stationery", "item": "Paper Bundle", "quantity": 25, "unit_price": 14.5, "status": "Completed"},
        {"order_id": 505, "customer": "Acme Corp", "category": "Electronics", "item": "USB-C Hub", "quantity": 15, "unit_price": 45.0, "status": "Cancelled"},
        {"order_id": 506, "customer": "Hooli", "category": "Furniture", "item": "Standing Desk", "quantity": 4, "unit_price": 480.0, "status": "Completed"},
        {"order_id": 507, "customer": "Globex Inc", "category": "Electronics", "item": "Webcam HD", "quantity": 10, "unit_price": 75.0, "status": "Completed"},
        {"order_id": 508, "customer": "Initech", "category": "Stationery", "item": "Whiteboard Pens", "quantity": 30, "unit_price": 6.0, "status": "Completed"},
        {"order_id": 509, "customer": "Wayne Ent", "category": "Furniture", "item": "Executive Chair", "quantity": 2, "unit_price": 650.0, "status": "Completed"},
        {"order_id": 510, "customer": "Hooli", "category": "Electronics", "item": "Docking Station", "quantity": 6, "unit_price": 180.0, "status": "Pending"}
    ],
    "students": [
        {"student_id": 201, "name": "Emma Watson", "major": "Computer Science", "gpa": 3.92, "credits": 84, "year": "Junior", "scholarship": 5000},
        {"student_id": 202, "name": "Lucas Scott", "major": "Business", "gpa": 3.45, "credits": 45, "year": "Sophomore", "scholarship": 2000},
        {"student_id": 203, "name": "Sophia Chen", "major": "Computer Science", "gpa": 3.88, "credits": 110, "year": "Senior", "scholarship": 7500},
        {"student_id": 204, "name": "Noah Miller", "major": "Biology", "gpa": 2.95, "credits": 30, "year": "Freshman", "scholarship": 0},
        {"student_id": 205, "name": "Olivia Davis", "major": "Business", "gpa": 3.71, "credits": 92, "year": "Junior", "scholarship": 4000},
        {"student_id": 206, "name": "Ethan Hunt", "major": "Mathematics", "gpa": 3.98, "credits": 115, "year": "Senior", "scholarship": 8000},
        {"student_id": 207, "name": "Ava Martinez", "major": "Computer Science", "gpa": 3.20, "credits": 50, "year": "Sophomore", "scholarship": 1500},
        {"student_id": 208, "name": "Mason Taylor", "major": "Biology", "gpa": 3.65, "credits": 78, "year": "Junior", "scholarship": 3000}
    ],
    "departments": [
        {"dept_name": "Engineering", "dept_head": "Charlie Lee", "floor": 4, "annual_budget": 500000},
        {"dept_name": "Marketing", "dept_head": "Fiona Gallagher", "floor": 2, "annual_budget": 200000},
        {"dept_name": "Sales", "dept_head": "Diana Prince", "floor": 3, "annual_budget": 350000},
        {"dept_name": "Finance", "dept_head": "Ian Malcolm", "floor": 5, "annual_budget": 300000}
    ]
}

DATASET_DESCRIPTIONS = {
    "employees": "Corporate employee roster with departments, compensation, experience, and performance scores.",
    "orders": "E-commerce order transactions with customer names, product categories, quantities, unit prices, and status.",
    "students": "University student records tracking majors, GPAs, earned credit hours, class year, and scholarships.",
    "departments": "Departmental information with heads, floor locations, and annual operational budgets."
}

EXAMPLE_QUERIES: List[ExampleQuery] = [
    ExampleQuery(
        id="ex-dept-high-earners",
        title="1. Department Stats & High Earner Filter",
        description="Demonstrates WHERE filtering individual rows followed by GROUP BY bucketing and HAVING filtering on groups.",
        level="Intermediate",
        dataset="employees",
        query="""SELECT 
    department, 
    COUNT(*) AS num_staff, 
    AVG(salary) AS avg_salary, 
    MAX(salary) AS peak_salary
FROM employees
WHERE salary >= 60000
GROUP BY department
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC;""",
        highlight_steps=["where", "group_by", "aggregates", "having", "select", "order_by"]
    ),
    ExampleQuery(
        id="ex-revenue-by-category",
        title="2. Category Revenue Breakdown",
        description="Calculates total order revenue per category for completed transactions.",
        level="Beginner",
        dataset="orders",
        query="""SELECT 
    category,
    COUNT(*) AS total_orders,
    SUM(quantity * unit_price) AS total_revenue
FROM orders
WHERE status = 'Completed'
GROUP BY category
ORDER BY total_revenue DESC;""",
        highlight_steps=["where", "group_by", "aggregates", "select", "order_by"]
    ),
    ExampleQuery(
        id="ex-window-salary-rank",
        title="3. Window Function: Salary Ranking",
        description="Shows Window Functions (OVER()) calculating dense ranks partitioned by department.",
        level="Advanced",
        dataset="employees",
        query="""SELECT 
    name, 
    department, 
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_salary_rank,
    AVG(salary) OVER (PARTITION BY department) as dept_avg
FROM employees
WHERE experience >= 3
ORDER BY department, salary DESC;""",
        highlight_steps=["where", "windows", "select", "order_by"]
    ),
    ExampleQuery(
        id="ex-distinct-majors",
        title="4. Distinct Majors & Scholarship Honors",
        description="Shows WHERE filtering, selecting expressions, and DISTINCT deduplication.",
        level="Beginner",
        dataset="students",
        query="""SELECT DISTINCT 
    major, 
    year
FROM students
WHERE gpa > 3.5
ORDER BY major, year;""",
        highlight_steps=["where", "select", "distinct", "order_by"]
    ),
    ExampleQuery(
        id="ex-top-earners-limit",
        title="5. Top Earners with Limit & Offset",
        description="Filters senior staff, sorts hierarchically, and trims output with LIMIT.",
        level="Beginner",
        dataset="employees",
        query="""SELECT 
    name, 
    department, 
    role, 
    salary
FROM employees
WHERE rating >= 4.0
ORDER BY salary DESC
LIMIT 4;""",
        highlight_steps=["where", "select", "order_by", "limit"]
    ),
    ExampleQuery(
        id="ex-join-dept-budget",
        title="6. JOIN Employees with Department Budget",
        description="Joins employees with department metadata on department name.",
        level="Intermediate",
        dataset="employees",
        query="""SELECT 
    e.name, 
    e.department, 
    e.salary, 
    d.annual_budget
FROM employees e
JOIN departments d ON e.department = d.dept_name
WHERE e.salary > 70000
ORDER BY e.salary DESC;""",
        highlight_steps=["from_join", "where", "select", "order_by"]
    )
]

def get_table_schema(table_name: str, rows: List[Dict[str, Any]]) -> TableSchema:
    if not rows:
        return TableSchema(
            table_name=table_name,
            description=DATASET_DESCRIPTIONS.get(table_name, "Custom dataset"),
            row_count=0,
            columns=[],
            sample_rows=[]
        )
    sample = rows[0]
    cols = []
    for k, v in sample.items():
        if isinstance(v, int):
            col_type = "INTEGER"
        elif isinstance(v, float):
            col_type = "FLOAT"
        elif isinstance(v, bool):
            col_type = "BOOLEAN"
        else:
            col_type = "VARCHAR"
        cols.append({"name": k, "type": col_type})
    return TableSchema(
        table_name=table_name,
        description=DATASET_DESCRIPTIONS.get(table_name, "Custom dataset"),
        row_count=len(rows),
        columns=cols,
        sample_rows=rows[:5]
    )
