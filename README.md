# Cynt — AI-Powered Startup Due Diligence Engine

> **Cynt** is a full-stack platform that automates startup investment due diligence using a multi-agent AI pipeline. Entrepreneurs submit their documents; investors receive structured analysis, scores, and a go/no-go recommendation — all in minutes.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Core Modules](#core-modules)
   - [Document Processor](#document-processor-coredocument_processorpy)
   - [Financial Simulation Engine](#financial-simulation-engine-corefinancial_simulationpy)
   - [Market Signal Connector](#market-signal-connector-coremarket_signalspy)
   - [Memo Generator](#memo-generator-corememo_generatorpy)
   - [Pipeline Orchestrator](#pipeline-orchestrator-corepipelinepy)
6. [AI Agents](#ai-agents)
   - [Financial Risk Agent](#financial-risk-agent)
   - [Market Validation Agent](#market-validation-agent)
   - [Founder Intelligence Agent](#founder-intelligence-agent)
   - [Investment Decision Engine (Meta-Agent)](#investment-decision-engine-meta-agent)
7. [Data Models](#data-models)
8. [Utilities](#utilities)
   - [LLM Client](#llm-client-utilsllmpy)
   - [MongoDB Connection](#mongodb-connection-utilsdbpy)
   - [Email Notifications](#email-notifications-utilsemail_senderpy)
   - [LinkedIn Integration](#linkedin-integration)
9. [API Reference](#api-reference)
   - [Auth](#auth)
   - [Applications](#applications)
   - [Collaborations (Legacy)](#collaborations-legacy)
   - [Collaboration Invites (New Workflow)](#collaboration-invites-new-workflow)
   - [Legacy Endpoints](#legacy-endpoints)
10. [Frontend](#frontend)
    - [App Routing](#app-routing)
    - [Entrepreneur Flow](#entrepreneur-flow)
    - [Investor Flow](#investor-flow)
11. [Data Flow: End-to-End](#data-flow-end-to-end)
12. [MongoDB Schema](#mongodb-schema)
13. [Environment Variables](#environment-variables)
14. [Running Locally](#running-locally)
15. [Docker / Deployment](#docker--deployment)
16. [Seeding the Database](#seeding-the-database)
17. [Scoring System Explained](#scoring-system-explained)

---

## Overview

Cynt is a **B2B investment intelligence platform** that connects entrepreneurs and investors. The core value proposition is a **4-stage async AI pipeline** that:

1. Extracts structured data from raw documents (PDFs, CSVs/XLSX).
2. Runs deterministic financial and market simulations.
3. Scores the startup across three dimensions using LLM-powered agents.
4. Synthesises a final investment recommendation and a plain-text investment memo.

**Two user roles** exist:
- **Entrepreneurs** — upload pitch deck, financials, and founder profile; track their application statuses.
- **Investors** — review applications, trigger AI analysis, accept/reject startups, and invite other investors to collaborate.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **LLM** | Groq API — `llama-3.3-70b-versatile` (via LangChain) |
| **Database** | MongoDB (PyMongo) |
| **Document parsing** | `pypdf`, `pandas`, `openpyxl` |
| **Market data** | `pytrends` (Google Trends), `newsapi-python` (News API) |
| **Authentication** | `bcrypt` (hashed passwords, auto-upgrade from legacy plaintext) |
| **Email** | SMTP (Gmail by default), `smtplib` |
| **LinkedIn data** | MongoDB pre-scraped cache + RapidAPI live fallback |
| **Templating** | `jinja2` (for memo generation) |
| **Frontend** | React 19, Vite 7 |
| **Frontend UI libs** | `recharts` (charts), `framer-motion` (animations), `lucide-react` (icons), `html2pdf.js` (PDF export) |
| **Container** | Docker (multi-stage build: Node 20 → Python 3.11-slim) |
| **Deployment target** | HuggingFace Spaces (port 7860), local (port 8000) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser / Client                           │
│                        React 19 + Vite SPA                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP (REST, FormData)
┌───────────────────────────────▼─────────────────────────────────────┐
│                      FastAPI Gateway (api/gateway.py)               │
│  Auth  │  Applications  │  Collaborations  │  Invites  │  Legacy    │
└──┬─────────────┬──────────────────────────────────────────────────┬─┘
   │             │                                                  │
   ▼             ▼                                                  ▼
MongoDB     AI Pipeline                                       Static files
(PyMongo)   (core/pipeline.py)                             (frontend/dist)
               │
   ┌───────────┼────────────────────────────┐
   ▼           ▼           ▼                ▼
Stage 1:   Stage 1b:   Stage 2:         Stage 3:
Financial  LinkedIn    Three agents     Investment
Simulation enrichment  in parallel      Decision
+Market               (Financial Risk,  Engine
Signals               Market Validation,(Meta-Agent)
                      Founder Intel.)
                                         │
                                         ▼
                                     Stage 4:
                                     Memo Generator
                                     (Jinja2)
```

### Pipeline Concurrency Model

The pipeline uses Python `asyncio` with a `ThreadPoolExecutor(max_workers=6)` to run synchronous tasks off the event loop:

- **Stage 1** — `financial_simulation` + `market_signals` run **concurrently** (no dependencies).
- **Stage 1b** — LinkedIn live enrichment (optional, non-blocking, RapidAPI fallback).
- **Stage 2** — All three agents (`financial_risk`, `market_validation`, `founder_intelligence`) run **concurrently** (each requires Stage 1 output).
- **Stage 3** — `investment_decision_engine` runs after all three agent outputs are collected.
- **Stage 4** — `memo_generator` renders the final Jinja2 text template deterministically.

---

## Project Structure

```
cynt_due_diligence/
│
├── main.py                          # Entry point — starts Uvicorn
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Multi-stage Docker build
├── sample_portfolio.json            # Example InvestorPortfolio JSON
│
├── api/
│   └── gateway.py                   # FastAPI app — all endpoints (~966 lines)
│
├── core/
│   ├── pipeline.py                  # Async 4-stage orchestrator
│   ├── document_processor.py        # PDF/CSV extraction + LLM field extraction
│   ├── financial_simulation.py      # Deterministic financial metrics
│   ├── market_signals.py            # Google Trends + News API signals
│   └── memo_generator.py            # Jinja2 investment memo
│
├── agents/
│   ├── financial_risk_agent.py      # LLM agent: financial health scoring
│   ├── market_validation_agent.py   # LLM agent: market momentum + saturation
│   ├── founder_intelligence_agent.py# LLM agent: domain fit, network, execution
│   ├── investment_decision_engine.py# Meta-agent: weighted decision score
│   └── founder_intelligence_agent_real.py  # (alternate/legacy variant)
│
├── utils/
│   ├── models.py                    # All Pydantic data models
│   ├── llm.py                       # ChatGroq init + JSON extraction helper
│   ├── db.py                        # MongoDB lazy singleton + collection accessors
│   ├── email_sender.py              # SMTP email notifications (approved/rejected)
│   ├── linkedin_fetcher.py          # MongoDB-backed LinkedIn profile lookup
│   ├── linkedin_scraper.py          # RapidAPI live LinkedIn scraper + mapper
│   ├── linkedin_scrappper.py        # scrape_and_store_linkedin: triggers scrape + store
│   ├── scraper.py                   # (helper scraper utility)
│   ├── seed_db.py                   # Seed script (legacy)
│   └── seed_users.py                # Seed 4 sample investor accounts to MongoDB
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                 # React DOM render
│       ├── App.jsx                  # Role-based routing (Login/Entrepreneur/Investor)
│       ├── api.js                   # Typed API client (all fetch calls)
│       ├── index.css                # Global design system + component styles
│       └── components/
│           ├── LoginPage.jsx        # Login + registration modal
│           ├── EntrepreneurDashboard.jsx   # Entrepreneur view
│           ├── InvestorDashboard.jsx       # Investor view (largest component)
│           ├── WizardLayout.jsx     # Multi-step wizard container
│           ├── Step1_Upload.jsx     # Upload files step
│           ├── Step2_Config.jsx     # Investor portfolio config step
│           ├── Step3_Analyzing.jsx  # Loading / analysis-in-progress step
│           └── Step4_Results.jsx    # Full results display step
│
└── data/                            # (data directory, used by scraper)
```

---

## Core Modules

### Document Processor (`core/document_processor.py`)

Extracts a structured `StartupProfile` from three uploaded documents:

| Input | Format | How processed |
|---|---|---|
| Pitch deck | PDF | `pypdf.PdfReader` — text extracted per page |
| Financials | CSV or XLSX | `pandas.read_csv` / `read_excel` |
| Founder profile | PDF | `pypdf.PdfReader` |

**Two-phase extraction:**

1. **Deterministic CSV parse** (`parse_financial_csv`): looks for standard metric rows (`Annual Revenue`, `Monthly Burn Rate`, `Existing Cash on Hand`, `Target Raise Amount`, `Pre-Money Valuation`, `Annual Growth Rate`, `TAM`) in a `Metric, Current, Projected` CSV format. These values **always override** LLM estimates for financial fields.

2. **LLM extraction** (`ChatGroq llama-3.3-70b-versatile`): given the first 6000 chars of pitch deck + 3000 chars each of financials and founder profile, extracts a JSON object with ~19 fields covering company basics, market claims, financials, and founder info.

3. **LinkedIn enrichment**: if a LinkedIn URL (`linkedin.com/in/...`) is found in founder text or pitch deck, `linkedin_fetcher.fetch_linkedin_profile()` is called first (MongoDB cache), then attaches `LinkedInProfile` to the `StartupProfile`.

---

### Financial Simulation Engine (`core/financial_simulation.py`)

Fully **deterministic** (no LLM). Takes a `StartupProfile` and computes:

| Metric | Formula |
|---|---|
| `runway_months` | `(existing_cash + raise_amount) / net_monthly_burn` |
| `burn_multiple` | `annual_burn / net_new_ARR` (burn per $1 of new ARR grown) |
| `dilution_pct` | `raise_amount / (pre_money_val + raise_amount) × 100` |
| `bankruptcy_projection_months` | `existing_cash / net_monthly_burn` (without the new raise) |
| `capital_efficiency_ratio` | `revenue / total_capital` |

Where `net_burn = max(monthly_burn - monthly_revenue, 0)`.

---

### Market Signal Connector (`core/market_signals.py`)

Fetches external market signals and normalises them to 0–100:

| Signal | Source | Caching |
|---|---|---|
| `google_trends_score` | `pytrends` — 12-month interest for sector keyword | `@lru_cache(128)` |
| `news_frequency_score` | News API — total article count (log-normalised, cap 100) | `@lru_cache(128)` |
| `composite_signal_score` | `0.5 × trends + 0.5 × news` | derived |

Falls back to `50.0` for any signal if API key is missing or call fails.

---

### Memo Generator (`core/memo_generator.py`)

Renders a plain-text **investment memo** using Jinja2 from the complete `DueDiligenceResult`. Fully deterministic — no LLM. The template covers:

- Company header (name, sector, stage, geography, founder, raise, valuation)
- Final recommendation + decision score + check size tier
- Score dashboard (4 scores)
- Financial analysis (runway, burn multiple, dilution, bankruptcy, capital efficiency, valuation flag, key risks)
- Market validation (TAM, growth %, external signals, key risks)
- Founder assessment (all sub-scores, risk level, key risks)
- Aggregate key risks
- Required milestones

---

### Pipeline Orchestrator (`core/pipeline.py`)

The `run_pipeline(startup, portfolio)` coroutine:

```python
# Stage 1 — parallel
simulation, raw_signals = await asyncio.gather(
    _run_in_thread(run_financial_simulation, startup),
    _run_in_thread(fetch_market_signals, startup.sector, startup.competitors)
)

# Stage 1b — LinkedIn live fallback
await _run_in_thread(_enrich_with_linkedin, startup)

# Stage 2 — three agents in parallel
financial_risk, market_validation, founder_intelligence = await asyncio.gather(
    _run_in_thread(run_financial_risk_agent, startup, simulation),
    _run_in_thread(run_market_validation_agent, startup, market_signals),
    _run_in_thread(run_founder_intelligence_agent, startup),
)

# Stage 3 — meta-agent
investment_decision = await _run_in_thread(run_investment_decision_engine, ...)

# Stage 4 — deterministic memo
result.memo = generate_memo(result)
```

The `_enrich_with_linkedin` helper extracts a LinkedIn URL regex from `founder_background` and calls the RapidAPI scraper **only** if the MongoDB cache missed (from Stage 0 in `document_processor.py`).

---

## AI Agents

All agents use `langchain_groq.ChatGroq` with `temperature=0` (deterministic), `llama-3.3-70b-versatile`. They receive a structured system prompt + a tightly-formatted human message and return a **JSON object only**.

### Financial Risk Agent

**Input:** `StartupProfile` + `FinancialSimulationResult`

Prompt includes: runway, burn multiple, dilution, bankruptcy months, capital efficiency, ARR multiple (valuation / revenue), all financial claims.

**Output (`FinancialRiskOutput`):**
| Field | Type | Description |
|---|---|---|
| `sustainability_score` | `int 0–100` | Financial health, 100 = safest |
| `bankruptcy_timeline_months` | `int` | Predicted months until cash-out |
| `capital_efficiency_ratio` | `float` | ARR / capital raised |
| `valuation_realism_flag` | `bool` | True if ARR multiple > 50× |
| `key_financial_risks` | `[str, str, str]` | Three key financial risks |

---

### Market Validation Agent

**Input:** `StartupProfile` + `MarketSignals`

The agent is instructed to be **skeptical** — startups typically overstate TAM and understate competition.

**Output (`MarketValidationOutput`):**
| Field | Type | Description |
|---|---|---|
| `market_momentum_score` | `int 0–100` | Real demand, based on composite signal |
| `hype_vs_evidence_delta` | `float` | `(claimed_growth/100) - (composite/100)` |
| `competitive_saturation_score` | `int 0–100` | 100 = blue ocean, 0 = extremely crowded |
| `key_market_risks` | `[str, str, str]` | Three key market risks |

Saturation rubric: 90–100 for true blue ocean, 10–39 for crowded sectors (SaaS, AI wrappers, crypto). High composite signal (>70) implies crowding → lower score.

---

### Founder Intelligence Agent

**Input:** `StartupProfile` (with optional `LinkedInProfile`)

Two different prompts depending on data availability:
- **With LinkedIn** — uses verified scraped data: headline, account tenure, premium/hiring/influencer/creator status, location.
- **Fallback** — uses document-extracted fields: exits, domain years, advisors, LinkedIn connections estimate.

**Output (`FounderIntelligenceOutput`):**
| Field | Type | Description |
|---|---|---|
| `founder_intelligence_score` | `int 0–100` | Composite (avg of A, B, C) |
| `domain_fit_score` | `int 0–100` | Sector relevance, technical depth |
| `network_strength_score` | `int 0–100` | Premium, influencer, hub location |
| `execution_credibility_score` | `int 0–100` | Prior exits, hiring, shipped products |
| `risk_level` | `LOW/MEDIUM/HIGH` | LOW if ≥70, MEDIUM if 40–69, HIGH if <40 |
| `key_founder_risks` | `[str, str, str]` | Three key founder risks |

`domain_fit_score` is floor-clamped to 20 to prevent aggressively harsh outputs.

---

### Investment Decision Engine (Meta-Agent)

**Input:** All three agent outputs + `InvestorPortfolio`

**Step 1 — Weighted score (deterministic):**

Weights vary by investor type:

| Investor Type | Financial | Market | Founder | Competitive |
|---|---|---|---|---|
| `ANGEL` | 0.25 | 0.25 | 0.40 | 0.10 |
| `EARLY_VC` | 0.35 | 0.30 | 0.30 | 0.05 |
| `ACCELERATOR` | 0.25 | 0.25 | 0.40 | 0.10 |
| `COMMITTEE` | 0.40 | 0.30 | 0.25 | 0.05 |

**Step 2 — Decision classification (deterministic):**
| Score | Decision |
|---|---|
| ≥ 75 | `INVEST` |
| 60–74 | `INVEST_WITH_CONDITIONS` |
| 45–59 | `WATCHLIST` |
| < 45 | `PASS` |

**Step 3 — Check size tier (deterministic):**
Compares raise amount to investor's `check_size_range_usd` midpoint → `SMALL`, `MEDIUM`, or `LARGE`.

**Step 4 — LLM narrative (one call):**
Generates 4 aggregate `key_risks` and 3 `required_milestones` from the collected risk lists.

**Output (`InvestmentDecisionOutput`):**
| Field | Type |
|---|---|
| `final_decision` | `INVEST/INVEST_WITH_CONDITIONS/WATCHLIST/PASS` |
| `decision_score` | `float 0–100` |
| `key_risks` | `[str × 4]` |
| `required_milestones` | `[str × 3]` |
| `suggested_check_size_tier` | `SMALL/MEDIUM/LARGE` |

---

## Data Models

All models are Pydantic v2 (`utils/models.py`).

### Enums
- `InvestorType`: `ANGEL`, `EARLY_VC`, `ACCELERATOR`, `COMMITTEE`
- `FinalDecision`: `INVEST`, `INVEST_WITH_CONDITIONS`, `WATCHLIST`, `PASS`
- `CheckSizeTier`: `SMALL`, `MEDIUM`, `LARGE`
- `RiskLevel`: `LOW`, `MEDIUM`, `HIGH`

### Core Models
- **`StartupProfile`** — all fields extracted from documents (company basics, market claims, financials, founder info, optional `LinkedInProfile`)
- **`InvestorPortfolio`** — investor type, sectors, stages, geographies, check size range, total investments, max sector concentration %
- **`LinkedInProfile`** — full_name, headline, premium/hiring/influencer/creator booleans, created_date, location; computed `linkedin_tenure_years` property
- **`DueDiligenceResult`** — top-level result holding `StartupProfile`, `FinancialSimulationResult`, `MarketSignals`, all three agent outputs, `InvestmentDecisionOutput`, and the rendered `memo` string

---

## Utilities

### LLM Client (`utils/llm.py`)

```python
def get_llm(temperature=0.0) -> ChatGroq:
    return ChatGroq(model="llama-3.3-70b-versatile", temperature=temperature, api_key=os.getenv("GROQ_API_KEY"))
```

`extract_json(text)` — three-tier JSON extraction: direct parse → strip markdown fences → regex `{...}` block.

---

### MongoDB Connection (`utils/db.py`)

Lazy singleton pattern. Collections:

| Accessor | Collection | Purpose |
|---|---|---|
| `get_users_collection()` | `due_diligence.users` | Investors + Entrepreneurs |
| `get_applications_collection()` | `due_diligence.applications` | Submitted applications (stores file binaries) |
| `get_collaborations_collection()` | `due_diligence.collaborations` | Legacy collaboration records |
| `get_collaboration_invites_collection()` | `due_diligence.collaboration_invites` | New invite-based workflow |
| `get_indicator_collection()` | `${DB_NAME}.${COLLECTION_NAME}` | Pre-scraped LinkedIn data |

---

### Email Notifications (`utils/email_sender.py`)

`send_decision_email(to_email, company_name, decision, message, investor_name)` — sends branded HTML email via SMTP (Gmail TLS port 587). Two templates: **approved** (green) and **declined** (red/orange). Fails silently so it never blocks the decision flow.

---

### LinkedIn Integration

Three-tier LinkedIn data strategy:

| Tier | File | When Used |
|---|---|---|
| **1 — MongoDB cache** | `utils/linkedin_fetcher.py` | `document_processor.py` looks up URL in `indicator` collection first |
| **2 — RapidAPI live** | `utils/linkedin_scraper.py` | `pipeline.py` live-fallback if MongoDB missed |
| **3 — Fallback** | `agents/founder_intelligence_agent.py` | Fallback prompt if no LinkedIn data at all |

`linkedin_scrappper.py` (note the triple-p filename) — `scrape_and_store_linkedin(url)`: calls RapidAPI and writes raw result into MongoDB `indicator` collection; triggered from `gateway.py` at application submission time.

---

## API Reference

Base URL: `http://localhost:8000` (local) or `https://<your-hf-space>.hf.space` (production).

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user (entrepreneur or investor). Passwords bcrypt-hashed on creation. |
| `POST` | `/auth/login` | Login. Supports both bcrypt and legacy plaintext (auto-upgrades to bcrypt). |

**Registration payload** (JSON in FormData `payload` field):
```json
{
  "email": "founder@startup.com",
  "password": "secret",
  "name": "Jane Doe",
  "role": "entrepreneur"  // or "investor"
}
```

Investor registration additionally accepts: `investor_type`, `sectors`, `stages`, `geographies`, `check_size_range_usd`, `total_investments`, `max_sector_concentration_pct`.

---

### Applications

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/applications` | Entrepreneur submits application (multipart: `investor_id`, `entrepreneur_id`, `company_name`, `linkedin_url`, `pitch_deck` PDF, `financials` CSV/XLSX, `founder_profile` PDF). Stores file bytes as MongoDB Binary. Triggers LinkedIn pre-scrape. |
| `GET` | `/applications/investor/{investor_id}` | Investor's direct applications + collaboration-invited applications (augmented with invite context). |
| `GET` | `/applications/entrepreneur/{entrepreneur_id}` | All applications submitted by an entrepreneur. |
| `POST` | `/applications/{app_id}/analyze` | Triggers full AI pipeline on the stored documents. Stores `analysis_result` dict and sets `status = "analyzed"`. |
| `POST` | `/applications/{app_id}/decision` | Investor accepts or rejects. Sets `status` to `"ACCEPTED"` or `"REJECTED"` (final, non-reversible). Sends email notification to entrepreneur. |
| `GET` | `/applications/{app_id}/deal-summary` | Full deal summary: all investors for this startup, all collaboration invites, list of active investors. |

**Application statuses:** `pending` → `analyzed` → `ACCEPTED` | `REJECTED`

---

### Collaborations (Legacy)

Older workflow: creates a collaboration record and adds collaborators to it.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collaborations` | Create a collaboration for an application. |
| `GET` | `/collaborations/application/{app_id}` | Get collaboration for a given application. |
| `POST` | `/collaborations/{collab_id}/invite` | Invite another investor to the collaboration. |
| `POST` | `/collaborations/{collab_id}/assess/{investor_id}` | Co-investor runs their own AI analysis. |
| `GET` | `/collaborations/investor/{investor_id}` | All collaborations where investor is lead or collaborator. |

---

### Collaboration Invites (New Workflow)

Invite-based: invited investor must assess **before** they can decide.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collaborations/invite` | Send collaboration invite. Guard checks: inviting investor must have `ACCEPTED` the startup; no self-invites; no duplicate invites; collaborator must not have `REJECTED` the startup. |
| `POST` | `/collaborations/invites/{invite_id}/assess` | Invited investor runs AI pipeline with their own portfolio profile. Required before deciding. |
| `POST` | `/collaborations/invites/{invite_id}/decide` | Invited investor accepts (`accept`) or rejects (`reject`) the collaboration. Persists to `collaborations` collection on accept. |
| `GET` | `/collaborations/hub/{investor_id}` | All decided invites (both sent and received) — `COLLAB_ACCEPTED` + `COLLAB_REJECTED`. |
| `GET` | `/collaborations/invites/investor/{investor_id}` | All invites where this investor is the collaborator. |
| `GET` | `/collaborations/invites/sent/{investor_id}` | All invites sent by this investor. |

**Invite statuses:** `INVITED` → `COLLAB_ASSESSED` → `COLLAB_ACCEPTED` | `COLLAB_REJECTED`

---

### Legacy Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/investors` | List all investor accounts. |
| `POST` | `/extract-profile` | Direct document upload → returns `StartupProfile` JSON (no user accounts). |
| `POST` | `/analyze` | Direct document upload + portfolio JSON → returns full `DueDiligenceResult` (no user accounts). |
| `GET` | `/health` | Health check → `{"status": "ok"}` |

---

## Frontend

Built with **React 19 + Vite 7**. Single-page app served from FastAPI's static file mount in production.

### App Routing (`App.jsx`)

```
App
├── (no user)  → LoginPage
├── (entrepreneur) → EntrepreneurDashboard
└── (investor) → InvestorDashboard
```

Role is set from the login API response and stored in React state.

API base URL auto-detects environment: Vite dev server (port 5170–5180) → `localhost:8000`; production → `window.location.origin`.

---

### Entrepreneur Flow

**`EntrepreneurDashboard.jsx`:**
- Shows a list of all submitted applications (company name, target investor, status badge, date).
- **"Apply to Investor"** button → opens a multi-step wizard:
  1. **Step1_Upload** — upload pitch deck (PDF), financials (CSV/XLSX), founder profile (PDF), enter company name and LinkedIn URL, select target investor(s).
  2. **Step2_Config** — (legacy wizard step for portfolio config).
  3. **Step3_Analyzing** — animated progress screen during pipeline execution.
  4. **Step4_Results** — displays the full `DueDiligenceResult`: score dashboard (cards + Recharts bar chart), financial simulation table, market signals, founder assessment, investment decision, and the raw text memo. Includes **PDF export** via `html2pdf.js`.
- Application statuses displayed: `Pending`, `Analyzed`, `Accepted`, `Rejected`.

---

### Investor Flow

**`InvestorDashboard.jsx`** (largest component, ~59KB):

**Tabs:**
1. **Applications** — all incoming applications (direct + collab-invited). For each:
   - View documents, trigger AI analysis, view results, send collaboration invite to another investor.
   - Accept or reject with optional message.
   - Deal summary showing all investors and collaborators on a startup.
2. **Invites** — all pending collaboration invites received. Can assess (run AI pipeline) and then accept/reject.
3. **Collaboration Hub** — decided invites (accepted + rejected) for both sent and received. Shows who invited whom and the final outcome.

---

### `api.js`

Singleton API client object exporting typed methods for every backend endpoint. Uses `fetch` with `FormData` for file uploads and JSON payloads. Centralizes error handling via `_json()` wrapper that throws on non-OK responses.

---

## Data Flow: End-to-End

```
Entrepreneur uploads documents
         │
         ▼
POST /applications
  → Files stored as Binary in MongoDB (applications collection)
  → LinkedIn URL passed to scrape_and_store_linkedin() (async pre-scrape)
         │
         ▼
POST /applications/{id}/analyze  (triggered by investor)
  → Fetch binary files from MongoDB
  → extract_startup_profile():
      ├── pypdf extracts text from PDFs
      ├── pandas parses CSV/XLSX financials
      ├── Deterministic CSV parse (7 financial fields)
      ├── LLM extracts remaining fields (one Groq API call)
      └── LinkedIn fetch from MongoDB cache
  → run_pipeline(startup, investor_portfolio):
      ├── [concurrent] financial_simulation + market_signals (Google Trends + News API)
      ├── [optional] LinkedIn live scrape via RapidAPI
      ├── [concurrent] financial_risk_agent + market_validation_agent + founder_intelligence_agent
      ├── investment_decision_engine (weighted score + LLM narrative)
      └── generate_memo (Jinja2 template)
  → Result saved to applications.analysis_result
         │
         ▼
POST /applications/{id}/decision
  → Status set to ACCEPTED / REJECTED
  → send_decision_email() to entrepreneur (SMTP)
         │
         ▼
(Optional) POST /collaborations/invite
  → Lead investor invites co-investor
  → Co-investor assesses (runs own pipeline with own portfolio)
  → Co-investor accepts/rejects
```

---

## MongoDB Schema

### `due_diligence.users`
```json
{
  "_id": ObjectId,
  "email": "string (unique)",
  "password": "bcrypt_hash",
  "name": "string",
  "role": "investor | entrepreneur",
  "created_at": ISODate,

  // Investor-only fields:
  "investor_type": "ANGEL | EARLY_VC | ACCELERATOR | COMMITTEE",
  "sectors": ["string"],
  "stages": ["string"],
  "geographies": ["string"],
  "check_size_range_usd": [min_float, max_float],
  "total_investments": int,
  "max_sector_concentration_pct": float
}
```

### `due_diligence.applications`
```json
{
  "_id": ObjectId,
  "entrepreneur_id": "string",
  "entrepreneur_name": "string",
  "investor_id": "string",
  "investor_name": "string",
  "company_name": "string",
  "linkedin_url": "string",
  "status": "pending | analyzed | ACCEPTED | REJECTED",
  "pitch_deck": Binary,
  "financials": Binary,
  "founder_profile": Binary,
  "pitch_deck_filename": "string",
  "financials_filename": "string",
  "founder_profile_filename": "string",
  "analysis_result": { /* DueDiligenceResult dict or null */ },
  "decision_message": "string",
  "decision_timestamp": ISODate,
  "created_at": ISODate
}
```

### `due_diligence.collaboration_invites`
```json
{
  "_id": ObjectId,
  "application_id": "string",
  "startup_company_name": "string",
  "entrepreneur_id": "string",
  "invited_by_investor_id": "string",
  "invited_by_investor_name": "string",
  "collaborator_investor_id": "string",
  "collaborator_investor_name": "string",
  "status": "INVITED | COLLAB_ASSESSED | COLLAB_ACCEPTED | COLLAB_REJECTED",
  "analysis_result": { /* DueDiligenceResult dict or null */ },
  "created_at": ISODate,
  "decision_timestamp": ISODate
}
```

### `due_diligence.collaborations`
```json
{
  "_id": ObjectId,
  "invite_id": "string",           // set only for new-workflow records
  "application_id": "string",
  "startup_company_name": "string",
  "invited_by_investor_id": "string",
  "invited_by_investor_name": "string",
  "collaborator_investor_id": "string",
  "collaborator_investor_name": "string",
  "status": "COLLAB_ACCEPTED",
  "created_at": ISODate
}
```

### `${DB_NAME}.${COLLECTION_NAME}` (LinkedIn indicator cache)
```json
{
  "linkedin_url": "string",
  "status": "scraped",
  "scraped_data": {
    "success": true,
    "data": { /* raw LinkedIn profile fields */ }
  }
}
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# LLM
GROQ_API_KEY=your_groq_api_key

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
DB_NAME=data                              # For LinkedIn indicator collection
COLLECTION_NAME=indicator                 # For LinkedIn indicator collection

# Market signals
NEWS_API_KEY=your_newsapi_key             # newsapi.org

# LinkedIn (optional — activates live scraping)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=fresh-linkedin-scraper-api.p.rapidapi.com

# Email notifications (optional)
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_HOST=smtp.gmail.com                  # default
SMTP_PORT=587                             # default

# Server (set by Docker/HF Spaces)
PORT=7860                                 # defaults to 8000 locally
```

**Minimum required**: `GROQ_API_KEY` + `MONGO_URI`

**Optional services** (system degrades gracefully):
- `NEWS_API_KEY` — market signals fall back to 50.0 neutral score
- `RAPIDAPI_KEY` — LinkedIn live scrape skipped (falls back to document text)
- `SMTP_EMAIL` + `SMTP_PASSWORD` — email notifications skipped silently

---

## Running Locally

### Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env  # or create .env manually

# Run the FastAPI server (with auto-reload in local mode)
python main.py
# → http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### Frontend (Dev Server)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

In dev mode, `api.js` automatically proxies to `http://localhost:8000`.

---

## Docker / Deployment

### Multi-Stage Build

The Dockerfile uses a two-stage build:

**Stage 1 (Node 20 Alpine):** Installs frontend deps, runs `npm run build`, produces `frontend/dist`.

**Stage 2 (Python 3.11 slim):**
- Installs `gcc`, `libffi-dev` for native Python deps.
- Installs Python packages from `requirements.txt`.
- Copies Python source (`main.py`, `api/`, `agents/`, `core/`, `utils/`).
- Copies built frontend from Stage 1 into `frontend/dist`.
- Sets `PORT=7860` (HuggingFace Spaces convention).
- Runs `python main.py`.

FastAPI serves the React SPA by mounting the `frontend/dist` folder at `/`:

```python
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

### Build and Run

```bash
docker build -t cynt .
docker run -p 7860:7860 --env-file .env cynt
# → http://localhost:7860
```

---

## Seeding the Database

Seed 4 sample investor accounts (Arjun Kapoor, Priya Sharma, David Chen, Mei Tanaka):

```bash
python -m utils.seed_users
```

This creates a unique index on `users.email` and inserts sample investors spanning all four investor types and different sector/geography focuses.

---

## Scoring System Explained

### Score Hierarchy

```
Final Decision Score (0–100)
  = w1 × Financial Risk (sustainability_score)
  + w2 × Market Momentum (market_momentum_score)
  + w3 × Founder Intelligence (founder_intelligence_score)
  + w4 × Competitive Opportunity (competitive_saturation_score)
```

Weights are dynamic per investor type — Angels and Accelerators weight founders higher (0.40); Committees weight financials higher (0.40).

### Decision Thresholds

| Score | Recommendation |
|---|---|
| ≥ 75 | **INVEST** — Strong conviction |
| 60–74 | **INVEST WITH CONDITIONS** — Promising but needs work |
| 45–59 | **WATCHLIST** — Monitor for progress |
| < 45 | **PASS** — Not ready at this time |

### Rubric Design Philosophy

- **Financial Risk** is measured relative to burn multiple thresholds (good <1.5×, danger >3×) and valuation sanity (>50× ARR multiple gets flagged).
- **Market Validation** is intentionally skeptical — the agent is told to expect startups to overstate competition. High Google Trends composite (>70) implies crowding, NOT opportunity.
- **Founder Intelligence** uses verified LinkedIn signals when available (tenure, premium, hiring, influencer status, hub location) — these are more reliable than document self-reporting. `domain_fit_score` has a minimum floor of 20 to prevent extremely harsh assessments.
- **Investment Decision Engine** uses the LLM only for narrative outputs (risks and milestones) — the actual decision score and classification are fully deterministic, ensuring reproducibility.