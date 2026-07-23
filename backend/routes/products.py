import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Inventory, InventoryLog, User
from schemas import ProductCreate, ProductUpdate
from routes.utils import get_current_user
from config import Config

products_router = APIRouter()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@products_router.get('')
def get_products(
    category: Optional[str] = None,
    barcode: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if barcode:
        query = query.filter(Product.barcode == barcode)
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))
    
    products = query.all()
    return [p.to_dict() for p in products]

@products_router.get('/{product_id}')
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.to_dict()

@products_router.post('', status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.barcode:
        existing = db.query(Product).filter(Product.barcode == req.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Product with barcode {req.barcode} already exists")
            
    product = Product(
        name=req.name,
        barcode=req.barcode,
        category=req.category,
        price=req.price,
        cost_price=req.cost_price,
        description=req.description,
        min_stock_level=req.min_stock_level,
        unit=req.unit
    )
    db.add(product)
    db.flush()  # get product.id
    
    inventory = Inventory(product_id=product.id, current_stock=req.initial_stock)
    db.add(inventory)
    
    if req.initial_stock > 0:
        log = InventoryLog(
            product_id=product.id,
            quantity_changed=req.initial_stock,
            change_type='IN',
            reason='Initial stock on product creation'
        )
        db.add(log)
        
    db.commit()
    db.refresh(product)
    return {'message': 'Product created successfully', 'product': product.to_dict()}

@products_router.put('/{product_id}')
def update_product(
    product_id: int,
    req: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if req.name is not None:
        product.name = req.name
    if req.category is not None:
        product.category = req.category
    if req.price is not None:
        product.price = req.price
    if req.cost_price is not None:
        product.cost_price = req.cost_price
    if req.description is not None:
        product.description = req.description
    if req.min_stock_level is not None:
        product.min_stock_level = req.min_stock_level
    if req.unit is not None:
        product.unit = req.unit
        
    if req.barcode is not None:
        if req.barcode != product.barcode and req.barcode:
            existing = db.query(Product).filter(Product.barcode == req.barcode).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Product with barcode {req.barcode} already exists")
        product.barcode = req.barcode
        
    db.commit()
    db.refresh(product)
    return {'message': 'Product updated successfully', 'product': product.to_dict()}

@products_router.delete('/{product_id}')
def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {'message': 'Product deleted successfully'}

@products_router.post('/{product_id}/image')
def upload_image(
    product_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if not allowed_file(image.filename):
        raise HTTPException(status_code=400, detail="Allowed image types are png, jpg, jpeg, gif, webp")
        
    ext = image.filename.rsplit('.', 1)[1].lower()
    new_filename = f"product_{product.id}.{ext}"
    
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(Config.UPLOAD_FOLDER, new_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(image.file.read())
        
    product.image_url = f"/api/uploads/{new_filename}"
    db.commit()
    
    return {'message': 'Image uploaded successfully', 'image_url': product.image_url}
