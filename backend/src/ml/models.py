import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import RobustScaler as SklearnRobustScaler

class RobustScaler:
    """RobustScaler: center on median, scale by IQR"""
    def __init__(self):
        self.medians = None
        self.iqrs = None
    
    def fit(self, X):
        X_arr = np.array(X)
        self.medians = np.median(X_arr, axis=0)
        q1 = np.percentile(X_arr, 25, axis=0)
        q3 = np.percentile(X_arr, 75, axis=0)
        self.iqrs = np.maximum(q3 - q1, 1e-8)
        return self
    
    def transform(self, X):
        X_arr = np.array(X)
        return ((X_arr - self.medians) / self.iqrs).tolist()
    
    def fit_transform(self, X):
        self.fit(X)
        return self.transform(X)
    
    def to_json(self):
        return {
            'medians': self.medians.tolist() if hasattr(self.medians, 'tolist') else self.medians,
            'iqrs': self.iqrs.tolist() if hasattr(self.iqrs, 'tolist') else self.iqrs
        }
    
    @classmethod
    def from_json(cls, json_data):
        scaler = cls()
        scaler.medians = np.array(json_data['medians'])
        scaler.iqrs = np.array(json_data['iqrs'])
        return scaler


class RidgeRegression:
    """Ridge Regression using numpy"""
    def __init__(self, lambda_val=1.0):
        self.lambda_val = lambda_val
        self.theta = None
    
    def fit(self, X, y):
        X_arr = np.array(X)
        y_arr = np.array(y)
        
        XtX = X_arr.T @ X_arr
        reg = np.eye(XtX.shape[0]) * self.lambda_val
        self.theta = np.linalg.inv(XtX + reg) @ (X_arr.T @ y_arr)
        return self
    
    def predict(self, X):
        X_arr = np.array(X)
        if len(X_arr.shape) == 1:
            X_arr = X_arr.reshape(1, -1)
        return (X_arr @ self.theta).tolist()
    
    def to_json(self):
        return {
            'lambda': self.lambda_val,
            'theta': self.theta.tolist() if hasattr(self.theta, 'tolist') else self.theta
        }
    
    @classmethod
    def from_json(cls, json_data):
        model = cls(json_data['lambda'])
        model.theta = np.array(json_data['theta'])
        return model


class RFRegressor:
    """Random Forest wrapper with proper save/load"""
    def __init__(self, options=None):
        if options is None:
            options = {}
        self.options = {'nEstimators': 100, 'seed': 42, **options}
        self.model = None
    
    def fit(self, X, y):
        self.model = RandomForestRegressor(
            n_estimators=self.options['nEstimators'],
            random_state=self.options['seed']
        )
        self.model.fit(np.array(X), np.array(y))
        return self
    
    def predict(self, X):
        if self.model is None:
            raise ValueError("Model not loaded. Call fit() or from_json() first.")
        return self.model.predict(np.array(X)).tolist()
    
    def to_json(self):
        if self.model is None:
            return {'options': self.options, 'model': None}
        
        return {
            'options': self.options,
            'model': {
                'n_estimators': self.model.n_estimators,
                'random_state': self.model.random_state,
                'feature_importances_': self.model.feature_importances_.tolist()
            }
        }
    
    @classmethod
    def from_json(cls, json_data):
        """Create RFRegressor from JSON - model needs to be refitted"""
        model = cls(json_data['options'])
        return model


# Add these metric functions at the bottom of models.py
def mae(actual, predicted):
    """Mean Absolute Error"""
    return sum(abs(a - p) for a, p in zip(actual, predicted)) / len(actual)


def r2(actual, predicted):
    """R-squared score"""
    mean_actual = sum(actual) / len(actual)
    ss_tot = sum((a - mean_actual) ** 2 for a in actual)
    ss_res = sum((a - p) ** 2 for a, p in zip(actual, predicted))
    return 0 if ss_tot == 0 else 1 - ss_res / ss_tot


def mape(actual, predicted):
    """Mean Absolute Percentage Error"""
    pairs = [(a, p) for a, p in zip(actual, predicted) if a > 0]
    if len(pairs) == 0:
        return 999.0
    return (sum(abs((a - p) / a) for a, p in pairs) / len(pairs)) * 100