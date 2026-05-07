import os
import json
import numpy as np
import joblib
from data_loader import load_daily_revenue
from features import engineer_features, to_matrix, FEATURE_KEYS
from models import RobustScaler, RidgeRegression, RFRegressor, mae, r2, mape
from sklearn.ensemble import RandomForestRegressor

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'savedModels')
os.makedirs(MODELS_DIR, exist_ok=True)


def loocv(ModelClass, model_args, X, y):
    """Leave-One-Out Cross Validation"""
    n = len(X)
    preds = [0] * n
    
    for i in range(n):
        X_train = [X[j] for j in range(n) if j != i]
        y_train = [y[j] for j in range(n) if j != i]
        
        model = ModelClass(*model_args)
        model.fit(X_train, y_train)
        preds[i] = model.predict([X[i]])[0]
    
    return {
        'mae': mae(y, preds),
        'r2': r2(y, preds),
        'mape': mape(y, preds),
    }


def train_and_select(brand_id=None):
    print('Loading daily revenue data...')
    daily = load_daily_revenue(brand_id)
    
    if len(daily) < 10:
        return {'error': f'Not enough data - got {len(daily)} days, need at least 10'}
    
    print(f'Loaded {len(daily)} daily records')
    print(f"Date range: {daily[0]['date']} to {daily[-1]['date']}")
    
    featured = engineer_features(daily)
    X = to_matrix(featured, FEATURE_KEYS)
    y = [row['revenue'] for row in daily]
    
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    
    candidates = [
        {'name': 'Ridge (l=1)', 'cls': RidgeRegression, 'args': [1.0]},
        {'name': 'Ridge (l=10)', 'cls': RidgeRegression, 'args': [10.0]},
        {'name': 'Random Forest', 'cls': RFRegressor, 'args': [{'nEstimators': 100}]},
    ]
    
    print('\nRunning LOOCV...')
    results = {}
    
    for cand in candidates:
        scores = loocv(cand['cls'], cand['args'], X_scaled, y)
        results[cand['name']] = scores
        print(f"   {cand['name']}: MAE={scores['mae']:.0f} | R2={scores['r2']:.4f} | MAPE={scores['mape']:.1f}%")
    
    # Pick best by MAE
    best_name = min(results.items(), key=lambda x: x[1]['mae'])[0]
    best_cand = next(c for c in candidates if c['name'] == best_name)
    
    print(f'\nBest: {best_name}')
    
    # Final fit on all data
    best_model = best_cand['cls'](*best_cand['args'])
    best_model.fit(X_scaled, y)
    
    # If best model is Random Forest, save the internal sklearn model directly
    if best_name == 'Random Forest':
        sklearn_model = best_model.model
        joblib.dump(sklearn_model, os.path.join(MODELS_DIR, 'best_model_sklearn.pkl'))
        print(f"Saved sklearn Random Forest model to best_model_sklearn.pkl")
    else:
        joblib.dump(best_model, os.path.join(MODELS_DIR, 'best_model_rf.pkl'))
    
    # Save artifacts as JSON
    with open(os.path.join(MODELS_DIR, 'best_model.json'), 'w') as f:
        json.dump(best_model.to_json(), f)
    
    with open(os.path.join(MODELS_DIR, 'scaler.json'), 'w') as f:
        json.dump(scaler.to_json(), f)
    
    with open(os.path.join(MODELS_DIR, 'feature_names.json'), 'w') as f:
        json.dump(FEATURE_KEYS, f)
    
    with open(os.path.join(MODELS_DIR, 'model_type.json'), 'w') as f:
        json.dump({'type': best_cand['cls'].__name__, 'name': best_name}, f)
    
    with open(os.path.join(MODELS_DIR, 'model_comparison.json'), 'w') as f:
        json.dump({'best': best_name, 'scores': results}, f, indent=2)
    
    return {'bestModel': best_name, 'scores': results, 'nSamples': len(daily)}


if __name__ == '__main__':
    result = train_and_select()
    print('\nTraining completed!')
    print(json.dumps(result, indent=2))