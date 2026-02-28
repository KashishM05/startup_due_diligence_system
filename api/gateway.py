"""
FastAPI Gateway — file intake, request routing, async orchestration.
Endpoints:
  POST /analyze         — full pipeline (file upload + portfolio JSON)
  POST /extract-profile — document extraction only (for preview/debug)
  GET  /health          — health check
  POST /auth/register   — register new user
  POST /auth/login      — login
  GET  /investors        — list all investors
  POST /applications     — entrepreneur submits an application
  GET  /applications/investor/{id}       — investor's received applications
  GET  /applications/entrepreneur/{id}   — entrepreneur's sent applications
  POST /applications/{id}/analyze        — investor triggers analysis
"""
import json
from pathlib import Path
from datetime import datetime
from bson import ObjectId, Binary

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from utils.models import InvestorPortfolio, DueDiligenceResult, StartupProfile
from core.document_processor import extract_startup_profile
from core.pipeline import run_pipeline
from utils.db import get_users_collection, get_applications_collection

app = FastAPI(
    title="AI Startup Due Diligence Engine",
    version="2.0.0",
    description="Structured AI-powered investment evaluation for startups.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _oid(s: str) -> ObjectId:
    """Convert string to ObjectId, raise 400 on failure."""
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {s}")


def _serialize_user(doc: dict) -> dict:
    """Make a MongoDB user doc JSON-serializable."""
    doc["_id"] = str(doc["_id"])
    doc.pop("password", None)
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


def _serialize_app(doc: dict) -> dict:
    """Make a MongoDB application doc JSON-serializable (strip binary files)."""
    doc["_id"] = str(doc["_id"])
    doc.pop("pitch_deck", None)
    doc.pop("financials", None)
    doc.pop("founder_profile", None)
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/register")
async def register(body: dict = Form(None), payload: str = Form(None)):
    """Register a new user. Accepts JSON string in 'payload' form field."""
    if payload:
        data = json.loads(payload)
    elif body:
        data = body
    else:
        raise HTTPException(status_code=422, detail="Missing registration data")

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()
    role = data.get("role", "").strip().lower()

    if not email or not password or not name:
        raise HTTPException(status_code=422, detail="email, password, and name are required")
    if role not in ("investor", "entrepreneur"):
        raise HTTPException(status_code=422, detail="role must be 'investor' or 'entrepreneur'")

    users = get_users_collection()

    if users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "email": email,
        "password": password,
        "name": name,
        "role": role,
        "created_at": datetime.utcnow(),
    }

    # Investor-specific fields
    if role == "investor":
        user_doc.update({
            "investor_type": data.get("investor_type", "EARLY_VC"),
            "sectors": data.get("sectors", []),
            "stages": data.get("stages", []),
            "geographies": data.get("geographies", []),
            "check_size_range_usd": data.get("check_size_range_usd", [100000, 1000000]),
            "total_investments": data.get("total_investments", 0),
            "max_sector_concentration_pct": data.get("max_sector_concentration_pct", 30.0),
        })

    result = users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return _serialize_user(user_doc)


@app.post("/auth/login")
async def login(payload: str = Form(...)):
    data = json.loads(payload)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        raise HTTPException(status_code=422, detail="email and password required")

    users = get_users_collection()
    user = users.find_one({"email": email})

    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _serialize_user(user)


# ─── Investors list ───────────────────────────────────────────────────────────

@app.get("/investors")
async def list_investors():
    users = get_users_collection()
    investors = list(users.find({"role": "investor"}))
    return [_serialize_user(inv) for inv in investors]


# ─── Applications ─────────────────────────────────────────────────────────────

@app.post("/applications")
async def submit_application(
    investor_id: str = Form(...),
    entrepreneur_id: str = Form(...),
    entrepreneur_name: str = Form(...),
    company_name: str = Form("Unnamed Startup"),
    pitch_deck: UploadFile = File(...),
    financials: UploadFile = File(...),
    founder_profile: UploadFile = File(...),
):
    """Entrepreneur submits an application to a specific investor."""
    users = get_users_collection()
    investor = users.find_one({"_id": _oid(investor_id), "role": "investor"})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    deck_bytes = await pitch_deck.read()
    fin_bytes = await financials.read()
    founder_bytes = await founder_profile.read()

    app_doc = {
        "entrepreneur_id": entrepreneur_id,
        "entrepreneur_name": entrepreneur_name,
        "investor_id": investor_id,
        "investor_name": investor.get("name", ""),
        "company_name": company_name,
        "status": "pending",
        "pitch_deck": Binary(deck_bytes),
        "financials": Binary(fin_bytes),
        "founder_profile": Binary(founder_bytes),
        "pitch_deck_filename": pitch_deck.filename or "pitch_deck.pdf",
        "financials_filename": financials.filename or "financials.csv",
        "founder_profile_filename": founder_profile.filename or "founder_profile.pdf",
        "analysis_result": None,
        "created_at": datetime.utcnow(),
    }

    apps = get_applications_collection()
    result = apps.insert_one(app_doc)
    app_doc["_id"] = result.inserted_id
    return _serialize_app(app_doc)


@app.get("/applications/investor/{investor_id}")
async def get_investor_applications(investor_id: str):
    apps = get_applications_collection()
    docs = list(apps.find({"investor_id": investor_id}))
    return [_serialize_app(d) for d in docs]


@app.get("/applications/entrepreneur/{entrepreneur_id}")
async def get_entrepreneur_applications(entrepreneur_id: str):
    apps = get_applications_collection()
    docs = list(apps.find({"entrepreneur_id": entrepreneur_id}))
    return [_serialize_app(d) for d in docs]


@app.post("/applications/{app_id}/analyze")
async def analyze_application(app_id: str):
    """Investor triggers the analysis pipeline on a submitted application."""
    apps = get_applications_collection()
    app_doc = apps.find_one({"_id": _oid(app_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    # Build investor portfolio from the investor's profile
    users = get_users_collection()
    investor = users.find_one({"_id": _oid(app_doc["investor_id"])})
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    portfolio = InvestorPortfolio(
        investor_type=investor.get("investor_type", "EARLY_VC"),
        portfolio_sectors=investor.get("sectors", []),
        portfolio_stages=investor.get("stages", []),
        portfolio_geographies=investor.get("geographies", []),
        check_size_range_usd=tuple(investor.get("check_size_range_usd", [100000, 1000000])),
        total_investments=investor.get("total_investments", 0),
        target_max_sector_concentration_pct=investor.get("max_sector_concentration_pct", 30.0),
    )

    # Extract startup profile from stored files
    deck_bytes = bytes(app_doc["pitch_deck"])
    fin_bytes = bytes(app_doc["financials"])
    founder_bytes = bytes(app_doc["founder_profile"])
    fin_filename = app_doc.get("financials_filename", "financials.csv")

    try:
        startup = extract_startup_profile(
            deck_bytes=deck_bytes,
            financial_bytes=fin_bytes,
            financial_filename=fin_filename,
            founder_bytes=founder_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Document extraction failed: {e}")

    try:
        result = await run_pipeline(startup, portfolio)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")

    # Store result and update status
    result_dict = result.model_dump()
    apps.update_one(
        {"_id": _oid(app_id)},
        {"$set": {"status": "analyzed", "analysis_result": result_dict}},
    )

    return result_dict


# ─── Legacy endpoints (preserved) ────────────────────────────────────────────

@app.get("/extract-profile")
async def redirect_extract_profile():
    return RedirectResponse(url="/")


@app.get("/analyze")
async def redirect_analyze():
    return RedirectResponse(url="/")


@app.post("/extract-profile", response_model=StartupProfile)
async def extract_profile(
    pitch_deck: UploadFile = File(..., description="Pitch deck PDF"),
    financials: UploadFile = File(..., description="Financial sheet (CSV or XLSX)"),
    founder_profile: UploadFile = File(..., description="Founder profile PDF"),
) -> StartupProfile:
    deck_bytes = await pitch_deck.read()
    financial_bytes = await financials.read()
    founder_bytes = await founder_profile.read()

    try:
        profile = extract_startup_profile(
            deck_bytes=deck_bytes,
            financial_bytes=financial_bytes,
            financial_filename=financials.filename or "financials.csv",
            founder_bytes=founder_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Document extraction failed: {e}")

    return profile


@app.post("/analyze", response_model=DueDiligenceResult)
async def analyze(
    pitch_deck: UploadFile = File(..., description="Pitch deck PDF"),
    financials: UploadFile = File(..., description="Financial sheet (CSV or XLSX)"),
    founder_profile: UploadFile = File(..., description="Founder profile PDF"),
    portfolio: str = Form(..., description="InvestorPortfolio JSON string"),
) -> DueDiligenceResult:
    try:
        portfolio_data = json.loads(portfolio)
        investor_portfolio = InvestorPortfolio(**portfolio_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid portfolio JSON: {e}")

    deck_bytes = await pitch_deck.read()
    financial_bytes = await financials.read()
    founder_bytes = await founder_profile.read()

    try:
        startup = extract_startup_profile(
            deck_bytes=deck_bytes,
            financial_bytes=financial_bytes,
            financial_filename=financials.filename or "financials.csv",
            founder_bytes=founder_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Document extraction failed: {e}")

    try:
        result = await run_pipeline(startup, investor_portfolio)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")

    return result


# ─── Serve frontend static files ──────────────────────────────────────────────
_frontend_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dir), html=True), name="frontend")
