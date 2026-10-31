# Canadian Healthcare Expenditure Analytics

FastAPI backend starter connected to the normalized MySQL database.

## 1. Requirements
- Python 3.10+
- MySQL Server running
- MySQL database `healthcare_analytics_db` already created and populated

## 2. Create a virtual environment (Windows PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use Command Prompt:
```cmd
.venv\Scripts\activate.bat
```

## 3. Install dependencies
```bash
pip install -r requirements.txt
```

## 4. Configure database connection
Copy `.env.example` to a new file named `.env`.
Update `DB_USER` and `DB_PASSWORD` with your MySQL credentials.
Do not share your `.env` file or upload it to GitHub.

## 5. Run the application
```bash
uvicorn app.main:app --reload
```

Open:
- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/api/health

## 6. Starter API endpoints
- `GET /api/health` – checks MySQL connection.
- `GET /api/dashboard/summary` – returns basic database metrics.
- `GET /api/dashboard/yearly` – returns the national yearly view.
- `GET /api/dashboard/provinces` – returns province/territory comparison.

If `/api/dashboard/yearly` or `/api/dashboard/provinces` fails, confirm the corresponding SQL views exist with the exact names and columns described in the SQL project.

## Project structure
```text
Healthcare_Analytics_App/
├── app/
│   ├── routers/
│   │   └── dashboard.py
│   ├── database.py
│   └── main.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```
