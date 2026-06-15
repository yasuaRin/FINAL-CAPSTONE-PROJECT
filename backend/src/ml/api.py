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
    allow_origin_regex=r"http://.*:5173",
    allow_credentials=True,
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

@app.post("/api/ml/retrain")
async def retrain(body: RetrainRequest, background_tasks: BackgroundTasks):
    if RetrainStatus.is_running:
        raise HTTPException(status_code=409, detail="Training already in progress")

    def run_pipeline():
        RetrainStatus.is_running = True
        try:
            print("\n" + "="*60)
            print("STARTING ML TRAINING...")
            print("="*60)
            
            print("Training models on historical data...")
            train_result = train_and_select(body.brand_id)
            if "error" in train_result:
                print("Training failed:", train_result['error'])
                RetrainStatus.last_result = train_result
                return
            
            print("Training completed successfully!")
            print("Best model:", train_result.get('best_model', 'Unknown'))
            print("R2 Score:", train_result.get('best_r2', 'N/A'))
            
            print("Generating predictions...")
            pred_result = predict_and_save(body.brand_id, body.n_future)
            
            print("Predictions saved to database!")
            print("Future predictions:", body.n_future, "periods")
            
            RetrainStatus.last_result = {**train_result, **pred_result, "completed": True}
            
            print("\n" + "="*60)
            print("TRAINING COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("Refresh your browser to see the forecast.\n")
            
        except Exception as e:
            print("Error during training:", str(e))
            RetrainStatus.last_result = {"error": str(e), "completed": False}
        finally:
            RetrainStatus.is_running = False

    background_tasks.add_task(run_pipeline)
    return {"message": "Training started", "status": "running"}

@app.get("/api/ml/retrain/status")
def retrain_status():
    return {
        "is_running": RetrainStatus.is_running,
        "last_result": RetrainStatus.last_result,
    }

@app.post("/api/ml/predict")
def predict_only(body: RetrainRequest):
    """Re-generate predictions from existing saved model (no retraining)."""
    result = predict_and_save(body.brand_id, body.n_future)
    return result

# IMPORTANT: Add this at the bottom to run the server
if __name__ == "__main__":
    import uvicorn
    print("""
============================================================
                    ML REVENUE FORECAST API
============================================================
  Server: http://localhost:3001
  Retrain: POST /api/ml/retrain
  Status:  GET /api/ml/retrain/status
  Predict: POST /api/ml/predict
============================================================
    """)
    uvicorn.run(app, host="0.0.0.0", port=3001)