import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from config import Config

def get_indian_festival_and_holiday(dt):
    # National Holidays
    # Republic Day: Jan 26
    # Independence Day: Aug 15
    # Gandhi Jayanti: Oct 2
    # Christmas: Dec 25
    
    # Festivals (Approximate windows)
    # Holi (March 10-25)
    # Eid (April 5-20)
    # Diwali (Oct 25 - Nov 15)
    
    is_holiday = 0
    is_festival = 0
    
    month = dt.month
    day = dt.day
    
    # National Holidays
    if (month == 1 and day == 26) or (month == 8 and day == 15) or (month == 10 and day == 2) or (month == 12 and day == 25):
        is_holiday = 1
        
    # Festivals (Approximate windows)
    if month == 3 and (10 <= day <= 25):
        is_festival = 1
    elif month == 4 and (5 <= day <= 20):
        is_festival = 1
    elif (month == 10 and day >= 25) or (month == 11 and day <= 15):
        is_festival = 1
        
    return is_holiday, is_festival

def feature_engineering(df, date_col='sale_date'):
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    
    df['day'] = df[date_col].dt.day
    df['month'] = df[date_col].dt.month
    df['year'] = df[date_col].dt.year
    df['day_of_week'] = df[date_col].dt.dayofweek
    df['week_of_year'] = df[date_col].dt.isocalendar().week.astype(int)
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    
    # Seasons: Winter (12, 1, 2), Summer (3, 4, 5, 6), Monsoon (7, 8, 9), Autumn (10, 11)
    def get_season(m):
        if m in [12, 1, 2]:
            return 0  # Winter
        elif m in [3, 4, 5, 6]:
            return 1  # Summer
        elif m in [7, 8, 9]:
            return 2  # Monsoon
        else:
            return 3  # Autumn
            
    df['season'] = df['month'].apply(get_season)
    
    # Holiday & Festival features
    fest_hol = df[date_col].apply(get_indian_festival_and_holiday)
    df['is_holiday'] = [x[0] for x in fest_hol]
    df['is_festival'] = [x[1] for x in fest_hol]
    
    return df

def train_forecasting_model(df, target_col='quantity', model_name_prefix='product'):
    df_feats = feature_engineering(df)
    
    features = ['day', 'month', 'day_of_week', 'week_of_year', 'is_weekend', 'season', 'is_holiday', 'is_festival']
    X = df_feats[features]
    y = df_feats[target_col]
    
    if len(df) < 10:
        raise ValueError("Not enough data to train. Need at least 10 historical records.")
        
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
    
    models = {
        'Linear Regression': LinearRegression(),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42),
        'XGBoost': XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    }
    
    metrics = {}
    trained_models = {}
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        
        # Guard against single-value R2 issues or small dataset variance
        try:
            r2 = r2_score(y_test, preds)
        except Exception:
            r2 = 0.0
            
        metrics[name] = {
            'MAE': float(mae),
            'RMSE': float(rmse),
            'R2': float(r2)
        }
        trained_models[name] = model
        
    # Select best model based on lowest MAE
    best_model_name = min(metrics, key=lambda k: metrics[k]['MAE'])
    best_model = trained_models[best_model_name]
    
    # Retrain on full dataset
    best_model.fit(X, y)
    
    # Save the best model
    os.makedirs(Config.MODEL_DIR, exist_ok=True)
    model_path = os.path.join(Config.MODEL_DIR, f"{model_name_prefix}_best.joblib")
    
    joblib.dump({
        'model': best_model,
        'model_name': best_model_name,
        'features': features,
        'metrics': metrics
    }, model_path)
    
    return {
        'best_model_name': best_model_name,
        'metrics': metrics,
        'model_path': model_path
    }

def predict_future_demand(model_path, start_date, days_to_predict=14):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
        
    saved_data = joblib.load(model_path)
    model = saved_data['model']
    features = saved_data['features']
    
    # Create future dates
    date_list = [start_date + timedelta(days=x) for x in range(days_to_predict)]
    future_df = pd.DataFrame({'sale_date': date_list})
    future_df = feature_engineering(future_df, date_col='sale_date')
    
    X_future = future_df[features]
    predictions = model.predict(X_future)
    # Clip negative predictions to 0
    predictions = np.clip(predictions, 0, None)
    
    future_df['predicted_quantity'] = predictions
    
    result = []
    for _, row in future_df.iterrows():
        result.append({
            'date': row['sale_date'].strftime('%Y-%m-%d'),
            'predicted_quantity': round(float(row['predicted_quantity']), 2)
        })
        
    return result
