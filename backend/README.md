# VIDHELP Backend

## Project Setup

### Prerequisites

Make sure you have the following installed before starting:

- Node.js v18 or higher
- npm
- Python 3.9+ (for ML modules)
- Postman (for endpoint testing)
- A Supabase account with a project created

---

## Installation

```bash
# Backend setup
cd backend
npm install

# ML module setup
cd src/ml
pip install -r requirements.txt
```

---

# Project Structure

```text
backend/
├── .env                    # Environment variables (Supabase keys, JWT secret, etc.)
├── .env.example            # Template for environment variables
├── node_modules/           # NPM dependencies
├── package-lock.json       # NPM lock file
├── package.json            # Project dependencies and scripts
├── README.md               # API documentation and setup guide
└── src/                    # Source code
    ├── controllers/        # Business logic for each module
    │   ├── authController.js     # Authentication logic
    │   ├── brandsController.js   # Brands CRUD operations
    │   ├── leadsController.js    # Leads management
    │   ├── revenueController.js  # Revenue/session data operations
    │   └── teamController.js     # Team member management
    │
    ├── index.js            # Main server file (Express app setup)
    │
    ├── middleware/         # Custom middleware
    │   └── authMiddleware.js     # JWT authentication middleware
    │
    ├── ml/                 # Machine Learning module (Dadia)
    │   ├── api.py                # FastAPI endpoints for ML
    │   ├── trainer.py            # Main training orchestrator
    │   ├── models.py             # ML model definitions
    │   ├── data_loader.py        # Fetches data from Supabase
    │   ├── features.py           # Feature engineering
    │   ├── predictor.py          # Future predictions generator
    │   ├── check_data.py         # Data validation (optional)
    │   ├── requirements.txt      # Python dependencies
    │   └── savedModels/          # Trained model artifacts
    │       ├── best_model_*.pkl
    │       ├── best_model.json
    │       ├── feature_names.json
    │       ├── model_comparison.json
    │       ├── model_type.json
    │       └── scaler.json
    │
    ├── routes/             # API route definitions
    │   ├── authRoutes.js         # Authentication routes (/api/auth/*)
    │   ├── brandsRoutes.js       # Brands routes (/api/brands/*)
    │   ├── leadsRoutes.js        # Leads routes (/api/leads/*)
    │   ├── revenueRoutes.js      # Revenue routes (/api/revenue/*)
    │   └── teamRoutes.js         # Team routes (/api/team/*)
    │
    └── utils/              # Utility functions
        └── supabase.js           # Supabase client configuration
```

---

# Architecture Overview

- **Modular Structure**  
  Each feature (auth, brands, revenue, team, leads) has its own controller and routes file.

- **Separation of Concerns**  
  Controllers handle business logic, routes handle HTTP endpoints, middleware handles authentication.

- **Supabase Integration**  
  The `supabase.js` utility provides the database client.

- **Environment Config**  
  Sensitive data is stored in the `.env` file.

- **Express.js Framework**  
  Main server setup in `index.js`.

- **Machine Learning Integration**  
  FastAPI server for revenue forecasting (separate from main backend).

---

# Environment Configuration

Create a `.env` file inside the `backend/` folder and fill in the following:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5000

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# ML Server Configuration
ML_API_URL=http://localhost:5001
```

---

# Where to Find Supabase Credentials

1. Go to https://supabase.com
2. Open your project
3. Click **Settings**
4. Click **API**
5. Copy the following values:

| Variable | Location |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public under Project API keys |
| `SUPABASE_SERVICE_KEY` | service_role under Project API keys |

---

# Running the Servers

## Start Node.js Backend Server

```bash
npm run dev
```

Expected output:

```text
Server running on port 5000
Environment: development
```

---

## Start ML Server

```bash
cd src/ml
python api.py
```

Expected output:

```text
🚀 ML API running on http://localhost:5001
📊 Connected to Supabase
🧠 ML models ready for training
```

---

# Health Check

## Backend Health Check

```http
GET http://localhost:5000/health
```

Expected response:

```json
{
  "success": true,
  "message": "VIDHELP Backend is running",
  "timestamp": "2025-xx-xxTxx:xx:xx.xxxZ"
}
```

---

## ML Server Health Check

```http
GET http://localhost:5001/api/ml/status
```

Expected response:

```json
{
  "status": "ready",
  "is_running": false,
  "last_training": null
}
```

---

# Authentication

All endpoints except `/health` and `/api/auth/login` require a Bearer Token.

---

## Step 1 — Login

```http
POST http://localhost:5000/api/auth/login
```

Body:

```json
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

Expected response:

```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin"
  }
}
```

---

## Step 2 — Add Token to Postman

1. Open Postman
2. Go to the **Authorization** tab
3. Select **Bearer Token**
4. Paste the token

If you receive a `401 Invalid or expired token`, repeat the login step.

---

# Endpoint Testing Guide

Base URL:

```text
http://localhost:5000
```

All endpoints below require a Bearer Token unless stated otherwise.

---

# Dashboard Module

The Dashboard page pulls data from the Revenue and Brands endpoints.

---

## Get All Revenue

```http
GET /api/revenue/read
```

Expected response:

- `200 OK`
- Returns revenue data including:
  - `revenue_shopee`
  - `revenue_tiktok`

---

## Get All Brands

```http
GET /api/brands/read
```

Expected response:

- `200 OK`
- Returns all brand records

---

# Revenue Module

## 1. Get All Revenue

```http
GET /api/revenue/read
```

Expected response:

```text
200 OK
```

---

## 2. Get Revenue with Filters

```http
GET /api/revenue/read?startDate=2025-01-01&endDate=2025-12-31
```

Expected response:

- Filtered revenue records
- Empty array if no data exists

---

## 3. Create Revenue

```http
POST /api/revenue/create
```

Body:

```json
{
  "date": "2025-01-15",
  "time": "10:00",
  "revenue_shopee": 500000,
  "revenue_tiktok": 500000,
  "period_id": 1,
  "host_id": 1,
  "brand_id": "f0cd0235-ffd8-4ac3-b033-ae9c86d4f0e8",
  "platform_id": "045dbc37-9740-44cd-99b7-03489159173a"
}
```

Notes:

- `brand_id` and `platform_id` are UUIDs
- `period_id` and `host_id` are integers

Expected response:

```text
201 Created
```

---

## 4. Update Revenue

```http
PUT /api/revenue/update/{id}
```

Body:

```json
{
  "revenue_shopee": 999999
}
```

Expected response:

```text
200 OK
```

---

## 5. Delete Revenue

```http
DELETE /api/revenue/delete/{id}
```

Expected response:

```json
{
  "success": true,
  "message": "Revenue record deleted"
}
```

---

# Brands Module

## 1. Get All Brands

```http
GET /api/brands/read
```

Expected response:

```text
200 OK
```

---

## 2. Create Brand

```http
POST /api/brands/create
```

Body:

```json
{
  "brand_name": "Test Brand",
  "brand_category": "Fashion",
  "brand_status": "active"
}
```

Expected response:

```text
201 Created
```

---

## 3. Update Brand

```http
PUT /api/brands/update/{brand_id}
```

Body:

```json
{
  "brand_name": "Updated Brand Name"
}
```

Expected response:

```text
200 OK
```

---

## 4. Delete Brand

```http
DELETE /api/brands/delete/{brand_id}
```

Expected response:

```json
{
  "success": true,
  "message": "Brand deleted"
}
```

---

## 5. Risk Signals

```http
GET /api/brands/risk-signals
```

Expected response:

- Returns:
  - `brand_id`
  - `brand_name`
  - `risk_level`
  - `status`

---

# Profile Module

## Get Current User Profile

```http
GET /api/auth/profile
```

Expected response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin",
    "full_name": "..."
  }
}
```

---

# Machine Learning Module (Student 2)

The ML module provides revenue forecasting capabilities using historical revenue data.

---

# ML Architecture

```text
ML Training Pipeline
        ↓
1. data_loader.py   → Fetches records from Supabase
        ↓
2. features.py      → Feature engineering
        ↓
3. models.py        → ML model definitions
        ↓
4. trainer.py       → Trains and selects best model
        ↓
5. predictor.py     → Generates future predictions
        ↓
6. api.py           → Serves ML endpoints
```

---

# ML Endpoints

## 1. Retrain Models

```http
POST http://localhost:5001/api/ml/retrain
```

Body:

```json
{
  "brand_id": null,
  "n_future": 12
}
```

Expected response:

```json
{
  "success": true,
  "message": "Training started",
  "train_id": "uuid"
}
```

---

## 2. Check Training Status

```http
GET http://localhost:5001/api/ml/status
```

Expected response:

```json
{
  "is_running": false,
  "last_result": {
    "success": true,
    "predictions_saved": 12,
    "best_model": "RandomForest"
  },
  "last_run": "2025-05-09T10:30:00"
}
```

---

## 3. Get Predictions

```http
GET http://localhost:5001/api/ml/predictions
```

Expected response:

```json
{
  "success": true,
  "data": [
    {
      "period_id": 26,
      "date": "2026-05-04",
      "predicted": 20065108,
      "is_future": true,
      "model_r2": 0.84
    }
  ]
}
```

---

# ML File Descriptions

| File | Purpose | Keep? |
|---|---|---|
| `api.py` | FastAPI server with ML endpoints | ✅ Required |
| `trainer.py` | Main training orchestrator | ✅ Required |
| `models.py` | ML model definitions | ✅ Required |
| `data_loader.py` | Fetches data from Supabase | ✅ Required |
| `features.py` | Feature engineering | ✅ Required |
| `predictor.py` | Generates future predictions | ✅ Required |
| `check_data.py` | Data validation/debugging | ⚠️ Optional |
| `requirements.txt` | Python dependencies | ✅ Required |
| `savedModels/` | Trained model artifacts | ✅ Auto-generated |

---

# Running the ML Server

```bash
cd backend/src/ml
python api.py
```

Default URL:

```text
http://localhost:5001
```

---

# ML Dependencies

```txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
numpy==1.24.3
scikit-learn==1.3.2
supabase==2.0.4
python-dotenv==1.0.0
joblib==1.3.2
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# How ML Training Works

1. **Data Loading**  
   Fetches all revenue records from Supabase.

2. **Feature Engineering**  
   Creates features such as:
   - Revenue trends
   - Day-of-week patterns
   - Period-over-period changes

3. **Model Training**
   - Linear Regression
   - Random Forest
   - Gradient Boosting
   - Ridge Regression

4. **Model Selection**  
   Uses LOOCV and R² score.

5. **Prediction**  
   Forecasts future revenue.

6. **Storage**  
   Saves predictions into `revenue_predictions`.

---

# Testing ML Endpoints in Postman

1. Ensure ML server runs on port `5001`
2. Test:

```http
GET http://localhost:5001/api/ml/status
```

3. Trigger retraining:

```http
POST http://localhost:5001/api/ml/retrain
```

Body:

```json
{
  "n_future": 12
}
```

4. Check status until:

```json
"is_running": false
```

5. View predictions:

```http
GET http://localhost:5001/api/ml/predictions
```

---

# Add Your Own Module

To create and register a new endpoint module:

1. Create:

```text
src/controllers/yourModuleController.js
```

2. Create:

```text
src/routes/yourModuleRoutes.js
```

3. Register route inside:

```text
src/index.js
```

Example:

```js
app.use('/api/your-module', yourModuleRoutes)
```

4. Restart server:

```bash
npm run dev
```

5. Test endpoints in Postman

---

# Notes for Team Members

## Tested Endpoints — Student 1

- POST `/api/auth/login`
- GET `/api/auth/profile`
- GET `/api/revenue/read`
- POST `/api/revenue/create`
- PUT `/api/revenue/update/:id`
- DELETE `/api/revenue/delete/:id`
- GET `/api/brands/read`
- POST `/api/brands/create`
- PUT `/api/brands/update/:id`
- DELETE `/api/brands/delete/:id`
- GET `/api/brands/risk-signals`

---

## Tested Endpoints — Student 2

- GET `/api/ml/status`
- POST `/api/ml/retrain`
- GET `/api/ml/predictions`

---

# Active Servers

| Server | Port | Purpose |
|---|---|---|
| Node.js Backend | 5000 | API endpoints, authentication, CRUD |
| ML FastAPI | 5001 | ML training and predictions |

---

# Database Views Created

| View | Purpose |
|---|---|
| `yearly_revenue` | Aggregates yearly revenue for dashboard loading |

---

# Features Included

- ✅ Backend API Documentation
- ✅ Authentication Flow
- ✅ CRUD Endpoint Guide
- ✅ ML Module Architecture
- ✅ ML Training Pipeline
- ✅ FastAPI Integration
- ✅ Two-Server Architecture
- ✅ Supabase Integration
- ✅ Health Checks
- ✅ Postman Testing Guide
- ✅ Database View Documentation