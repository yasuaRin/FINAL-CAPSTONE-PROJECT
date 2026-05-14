import math
from datetime import datetime

def rolling_mean(arr, window):
    """Calculate rolling mean with the last 'window' elements, truncating at start"""
    result = []
    for i in range(len(arr)):
        start = max(0, i - window + 1)
        slice_arr = arr[start:i+1]
        mean = sum(slice_arr) / len(slice_arr)
        result.append(mean)
    return result

def rolling_std(arr, window):
    """Calculate rolling standard deviation"""
    result = []
    for i in range(len(arr)):
        start = max(0, i - window + 1)
        slice_arr = arr[start:i+1]
        if len(slice_arr) < 2:
            result.append(0.0)
            continue
        mean = sum(slice_arr) / len(slice_arr)
        variance = sum((x - mean) ** 2 for x in slice_arr) / len(slice_arr)
        result.append(math.sqrt(variance))
    return result

def shift_array(arr, lag):
    """Shift array by lag (first lag items become 0)"""
    result = []
    for i in range(len(arr)):
        if i < lag:
            result.append(0.0)
        else:
            result.append(arr[i - lag])
    return result

def engineer_features(daily_rows):
    """Engineer features from daily revenue rows"""
    n = len(daily_rows)
    revenues = [row['revenue'] for row in daily_rows]
    viewers = [row['viewers'] for row in daily_rows]
    sessions = [row['sessions'] for row in daily_rows]
    likes = [row['likes'] for row in daily_rows]
    
    # Pre-compute rolling arrays (shift by 1 so we don't leak target into features)
    revenue_shifted = shift_array(revenues, 1)
    rm3 = rolling_mean(revenue_shifted, 3)
    rm7 = rolling_mean(revenue_shifted, 7)
    rs3 = rolling_std(revenue_shifted, 3)
    lag1 = shift_array(revenues, 1)
    lag7 = shift_array(revenues, 7)
    
    rows = []
    for i, row in enumerate(daily_rows):
        d = datetime.strptime(row['date'], '%Y-%m-%d')
        
        feature_row = {
            # Time features
            'dayOfWeek': d.weekday(),  # 0-6 (Monday=0)
            'dayOfMonth': d.day,        # 1-31
            'month': d.month,           # 1-12
            'dayIndex': i,              # global trend
            
            # Rolling revenue stats
            'revRollingMean3': rm3[i],
            'revRollingMean7': rm7[i],
            'revRollingStd3': rs3[i],
            
            # Lag features
            'revLag1': lag1[i],
            'revLag7': lag7[i],
            
            # Session metrics
            'sessions': row['sessions'],
            'viewers': row['viewers'],
            'likes': row['likes'],
            'revPerSession': row['revenue'] / row['sessions'] if row['sessions'] > 0 else 0,
            'revPerViewer': row['revenue'] / row['viewers'] if row['viewers'] > 0 else 0,
        }
        rows.append(feature_row)
    
    return rows

# Feature keys in exact order matching JavaScript version
FEATURE_KEYS = [
    'dayOfWeek', 'dayOfMonth', 'month', 'dayIndex',
    'revRollingMean3', 'revRollingMean7', 'revRollingStd3',
    'revLag1', 'revLag7',
    'sessions', 'viewers', 'likes',
    'revPerSession', 'revPerViewer',
]

def to_matrix(feature_rows, keys=None):
    """Convert feature rows to a 2D matrix"""
    if keys is None:
        keys = FEATURE_KEYS
    matrix = []
    for row in feature_rows:
        matrix_row = [row.get(k, 0) or 0 for k in keys]
        matrix.append(matrix_row)
    return matrix