from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Inventory, InventoryLog, User
from schemas import StockAdjustmentRequest
from routes.utils import get_current_user

inventory_router = APIRouter()

@inventory_router.get('')
def get_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inventory_records = db.query(Inventory).all()
    return [r.to_dict() for r in inventory_records]

@inventory_router.get('/low-stock')
def get_low_stock(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    low_stock_items = db.query(Product).join(Inventory).filter(
        Inventory.current_stock <= Product.min_stock_level
    ).all()
    return [item.to_dict() for item in low_stock_items]

@inventory_router.get('/logs')
def get_all_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(InventoryLog).order_by(InventoryLog.timestamp.desc()).all()
    return [log.to_dict() for log in logs]

@inventory_router.get('/{product_id}')
def get_product_inventory(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
        
    logs = db.query(InventoryLog).filter(InventoryLog.product_id == product_id).order_by(InventoryLog.timestamp.desc()).all()
    return {
        'inventory': inventory.to_dict(),
        'logs': [log.to_dict() for log in logs]
    }

@inventory_router.post('/adjust')
def adjust_stock(
    req: StockAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    inventory = db.query(Inventory).filter(Inventory.product_id == req.product_id).first()
    if not inventory:
        inventory = Inventory(product_id=req.product_id, current_stock=0)
        db.add(inventory)
        
    if req.change_type == 'IN':
        if req.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive for IN")
        inventory.current_stock += req.quantity
        qty_changed = req.quantity
    elif req.change_type == 'OUT':
        if req.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive for OUT")
        if inventory.current_stock < req.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock for this operation")
        inventory.current_stock -= req.quantity
        qty_changed = -req.quantity
    elif req.change_type == 'ADJUSTMENT':
        old_stock = inventory.current_stock
        inventory.current_stock = req.quantity
        qty_changed = req.quantity - old_stock
    else:
        raise HTTPException(status_code=400, detail="Invalid change_type. Must be IN, OUT, or ADJUSTMENT")
        
    log = InventoryLog(
        product_id=req.product_id,
        quantity_changed=qty_changed,
        change_type=req.change_type,
        reason=req.reason
    )
    db.add(log)
    db.commit()
    db.refresh(inventory)
    
    return {
        'message': 'Stock adjusted successfully',
        'inventory': inventory.to_dict()
    }
