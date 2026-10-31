from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.database import test_connection
from app.routers.dashboard import router as dashboard_router

app = FastAPI(
    title="Canadian Healthcare Expenditure Analytics",
    description="Database-driven healthcare expenditure analytics application",
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")
app.include_router(dashboard_router)

@app.get("/", response_class=HTMLResponse)
def dashboard_home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"active_page": "overview"},
    )

@app.get("/api/health")
def health_check():
    database_name = test_connection()
    return {"status": "ok", "database": database_name}
