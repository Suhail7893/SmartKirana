import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import pandas as pd
from datetime import datetime, date, timedelta
from database import get_db
from models import Product, Sale, Forecast, User
from schemas import TrainModelRequest, PredictDemandRequest
from routes.utils import get_current_user
from ml.pipeline import train_forecasting_model, predict_future_demand
from config import Config

forecast_router = APIRouter()

@forecast_router.post('/train')
def train_model(
    req: TrainModelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.product_id:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        products = [product]
    else:
        products = db.query(Product).all()
        
    results = {}
    success_count = 0
    
    for p in products:
        sales = db.query(Sale).filter(Sale.product_id == p.id).all()
        if not sales:
            results[str(p.id)] = {'status': 'skipped', 'reason': 'No sales history'}
            continue
            
        # Build dataframe
        sales_data = []
        for s in sales:
            sales_data.append({
                'sale_date': s.sale_date,
                'quantity': s.quantity
            })
            
        df = pd.DataFrame(sales_data)
        # Aggregate by day
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df_daily = df.groupby(df['sale_date'].dt.date).agg({'quantity': 'sum'}).reset_index()
        df_daily.rename(columns={'sale_date': 'sale_date'}, inplace=True)
        
        if len(df_daily) < 10:
            results[str(p.id)] = {
                'product_name': p.name,
                'status': 'skipped', 
                'reason': f'Insufficient unique days of sales (have {len(df_daily)}, need at least 10)'
            }
            continue
            
        try:
            train_res = train_forecasting_model(df_daily, target_col='quantity', model_name_prefix=f"product_{p.id}")
            results[str(p.id)] = {
                'product_name': p.name,
                'status': 'success',
                'best_model': train_res['best_model_name'],
                'metrics': train_res['metrics']
            }
            success_count += 1
        except Exception as e:
            results[str(p.id)] = {
                'product_name': p.name,
                'status': 'error',
                'reason': str(e)
            }
            
    return {
        'message': f'Model training completed. Successfully trained models for {success_count} products.',
        'results': results
    }

@forecast_router.post('/predict')
def predict_demand(
    req: PredictDemandRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    model_path = os.path.join(Config.MODEL_DIR, f"product_{product.id}_best.joblib")
    
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail=f'No trained ML model found for product: {product.name} (ID: {product.id}). Please trigger training first.'
        )
        
    if req.start_date:
        try:
            start_date_val = datetime.fromisoformat(req.start_date.replace('Z', '+00:00')).date()
        except ValueError:
            start_date_val = date.today() + timedelta(days=1)
    else:
        # Default to tomorrow
        start_date_val = date.today() + timedelta(days=1)
        
    try:
        # Convert start_date (date) to datetime for calculation compatibility
        start_dt = datetime.combine(start_date_val, datetime.min.time())
        predictions = predict_future_demand(model_path, start_dt, days_to_predict=req.days)
        
        # Save forecasts to database
        # 1. Clear existing forecasts for this product and date range
        end_date_val = start_date_val + timedelta(days=req.days - 1)
        db.query(Forecast).filter(
            Forecast.product_id == product.id,
            Forecast.forecast_date >= start_date_val,
            Forecast.forecast_date <= end_date_val
        ).delete()
        
        # 2. Bulk insert new forecasts
        for pred in predictions:
            f_date = datetime.strptime(pred['date'], '%Y-%m-%d').date()
            forecast_rec = Forecast(
                product_id=product.id,
                forecast_date=f_date,
                predicted_quantity=pred['predicted_quantity']
            )
            db.add(forecast_rec)
            
        db.commit()
        
        return {
            'product_id': product.id,
            'product_name': product.name,
            'forecast': predictions
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating predictions: {str(e)}")

@forecast_router.get('/{product_id}')
def get_saved_forecasts(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    forecasts = db.query(Forecast).filter(Forecast.product_id == product_id).order_by(Forecast.forecast_date.asc()).all()
    return [f.to_dict() for f in forecasts]
