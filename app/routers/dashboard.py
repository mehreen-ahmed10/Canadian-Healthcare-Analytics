from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.database import engine

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

def fetch_all(query, params=None):
    try:
        with engine.connect() as conn:
            return [dict(row) for row in conn.execute(text(query), params or {}).mappings().all()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dashboard query failed: {exc}")

def fetch_one(query, params=None):
    try:
        with engine.connect() as conn:
            row = conn.execute(text(query), params or {}).mappings().one()
            return dict(row)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dashboard query failed: {exc}")

@router.get("/summary")
def dashboard_summary():
    return fetch_one("""
        SELECT
          (SELECT COUNT(*) FROM geography WHERE geography_type IN ('Province','Territory')) AS regions,
          (SELECT MIN(year) FROM dim_year) AS first_year,
          (SELECT MAX(year) FROM dim_year) AS last_year,
          (SELECT COUNT(*) FROM fact_healthcare_expenditure) AS fact_records,
          (SELECT COUNT(*) FROM dim_age_group) AS age_groups
    """)

@router.get("/yearly")
def yearly_expenditure():
    return fetch_all("""
        SELECT y.year, f.total_expenditure, f.per_capita_expenditure
        FROM fact_healthcare_expenditure f
        JOIN dim_year y ON f.year_id = y.year_id
        JOIN geography g ON f.geography_id = g.geography_id
        JOIN dim_gender gen ON f.gender_id = gen.gender_id
        WHERE g.geography_type = 'National'
          AND gen.gender_category = 'Expenditure per year, both genders'
        ORDER BY y.year
    """)

@router.get("/provinces")
def province_expenditure():
    return fetch_all("""
        SELECT g.geography_name, g.geography_type,
               SUM(f.total_expenditure) AS total_expenditure,
               AVG(f.per_capita_expenditure) AS avg_per_capita
        FROM fact_healthcare_expenditure f
        JOIN geography g ON f.geography_id = g.geography_id
        JOIN dim_gender gen ON f.gender_id = gen.gender_id
        WHERE g.geography_type IN ('Province','Territory')
          AND gen.gender_category = 'Expenditure per year, both genders'
        GROUP BY g.geography_id, g.geography_name, g.geography_type
        ORDER BY total_expenditure DESC
    """)

@router.get("/gender")
def gender_expenditure(year: int = 2022):
    return fetch_all("""
        SELECT gen.gender_category, SUM(f.total_expenditure) AS total_expenditure
        FROM fact_healthcare_expenditure f
        JOIN dim_year y ON f.year_id = y.year_id
        JOIN geography g ON f.geography_id = g.geography_id
        JOIN dim_gender gen ON f.gender_id = gen.gender_id
        WHERE y.year = :year
          AND g.geography_type = 'National'
          AND gen.gender_category IN (
            'Expenditure per year, male',
            'Expenditure per year, female'
          )
        GROUP BY gen.gender_id, gen.gender_category
        ORDER BY gen.gender_category
    """, {"year": year})

@router.get("/age")
def age_expenditure(year: int = 2022):
    return fetch_all("""
        SELECT a.age_group, f.total_expenditure, f.per_capita_expenditure
        FROM fact_healthcare_expenditure f
        JOIN dim_year y ON f.year_id = y.year_id
        JOIN geography g ON f.geography_id = g.geography_id
        JOIN dim_gender gen ON f.gender_id = gen.gender_id
        JOIN dim_age_group a ON f.age_group_id = a.age_group_id
        WHERE y.year = :year
          AND g.geography_type = 'National'
          AND gen.gender_category = 'Expenditure per year, both genders'
        ORDER BY a.age_group_id
    """, {"year": year})
