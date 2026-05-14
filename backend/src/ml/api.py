# backend/src/ml/api.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from trainer import train_and_select
from predictor import predict_and_save

app = FastAPI(title="Revenue Forecast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RetrainRequest(BaseModel):
    brand_id: Optional[str] = None
    n_future: int = 14

class RetrainStatus:
    is_running = False
    last_result = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/retrain")
async def retrain(body: RetrainRequest, background_tasks: BackgroundTasks):
    if RetrainStatus.is_running:
        raise HTTPException(status_code=409, detail="Training already in progress")

    def run_pipeline():
        RetrainStatus.is_running = True
        try:
            train_result = train_and_select(body.brand_id)
            if "error" in train_result:
                RetrainStatus.last_result = train_result
                return
            pred_result = predict_and_save(body.brand_id, body.n_future)
            RetrainStatus.last_result = {**train_result, **pred_result}
        finally:
            RetrainStatus.is_running = False

    background_tasks.add_task(run_pipeline)
    return {"message": "Training started", "status": "running"}

@app.get("/retrain/status")
def retrain_status():
    return {
        "is_running": RetrainStatus.is_running,
        "last_result": RetrainStatus.last_result,
    }

@app.post("/predict")
def predict_only(body: RetrainRequest):
    """Re-generate predictions from existing saved model (no retraining)."""
    result = predict_and_save(body.brand_id, body.n_future)
    return result