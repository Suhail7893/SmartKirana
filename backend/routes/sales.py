from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Inventory, InventoryLog, Sale, User
from schemas import SaleCreate
from routes.utils import get_current_user

sales_router = APIRouter()

@sales_router.get('')
def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    product_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Sale)
    
    if product_id is not None:
        query = query.filter(Sale.product_id == product_id)
        
    if start_date:
        try:
            # Try to handle formats like 2026-07-03T19:13:18+05:30 or standard ISO format
            # If standard fromisoformat fails, try with replacing 'Z' or handling timezone offsets
            sd = start_date.replace('Z', '+00:00')
            start_dt = datetime.fromisoformat(sd)
            query = query.filter(Sale.sale_date >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            ed = end_date.replace('Z', '+00:00')
            end_dt = datetime.fromisoformat(ed)
            query = query.filter(Sale.sale_date <= end_dt)
        except ValueError:
            pass
            
    sales = query.order_by(Sale.sale_date.desc()).all()
    return [s.to_dict() for s in sales]

@sales_router.post('', status_code=status.HTTP_201_CREATED)
def create_sale(
    req: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
        
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    inventory = db.query(Inventory).filter(Inventory.product_id == req.product_id).first()
    if not inventory or inventory.current_stock < req.quantity:
        available = inventory.current_stock if inventory else 0
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient inventory. Available: {available}"
        )
        
    sale_price = req.sale_price if req.sale_price is not None else product.price
    total_amount = sale_price * req.quantity
    
    sale_date = datetime.utcnow()
    if req.sale_date:
        try:
            sd = req.sale_date.replace('Z', '+00:00')
            sale_date = datetime.fromisoformat(sd)
        except ValueError:
            pass
            
    # Deduct stock
    inventory.current_stock -= req.quantity
    
    # Record sale
    sale = Sale(
        product_id=req.product_id,
        quantity=req.quantity,
        sale_price=sale_price,
        total_amount=total_amount,
        sale_date=sale_date
    )
    db.add(sale)
    db.flush()  # Populate sale.id
    
    # Log stock out
    log = InventoryLog(
        product_id=req.product_id,
        quantity_changed=-req.quantity,
        change_type='OUT',
        reason=f"Sale transaction ID: {sale.id}",
        timestamp=sale_date
    )
    db.add(log)
    db.commit()
    db.refresh(sale)
    db.refresh(inventory)
    
    return {
        'message': 'Sale recorded successfully',
        'sale': sale.to_dict(),
        'current_stock': inventory.current_stock
    }

@sales_router.get('/summary')
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sales = db.query(Sale).all()
    total_revenue = sum(s.total_amount for s in sales)
    total_items_sold = sum(s.quantity for s in sales)
    
    best_seller = None
    best_seller_qty = 0
    
    from collections import defaultdict
    product_totals = defaultdict(int)
    for s in sales:
        product_totals[s.product_id] += s.quantity
        
    if product_totals:
        best_product_id = max(product_totals, key=product_totals.get)
        best_seller_qty = product_totals[best_product_id]
        p = db.query(Product).filter(Product.id == best_product_id).first()
        if p:
            best_seller = p.name
            
    return {
        'total_revenue': round(total_revenue, 2),
        'total_sales_count': len(sales),
        'total_items_sold': total_items_sold,
        'best_seller': best_seller,
        'best_seller_qty': best_seller_qty
    }
