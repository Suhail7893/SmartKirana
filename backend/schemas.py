from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# --- Auth Schemas ---
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "staff"

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    message: str
    token: str
    user: dict

# --- Product Schemas ---
class ProductCreate(BaseModel):
    name: str
    barcode: Optional[str] = None
    category: str
    price: float
    cost_price: float
    description: Optional[str] = None
    min_stock_level: Optional[int] = 10
    unit: Optional[str] = "units"
    initial_stock: Optional[int] = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    description: Optional[str] = None
    min_stock_level: Optional[int] = None
    unit: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    barcode: Optional[str]
    category: str
    price: float
    cost_price: float
    description: Optional[str]
    image_url: Optional[str]
    min_stock_level: int
    unit: str
    created_at: Optional[str]
    current_stock: int

    class Config:
        from_attributes = True

# --- Inventory Schemas ---
class StockAdjustmentRequest(BaseModel):
    product_id: int
    quantity: int
    change_type: str  # 'IN', 'OUT', 'ADJUSTMENT'
    reason: Optional[str] = ""

class InventoryResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str]
    current_stock: int
    last_updated: Optional[str]
    min_stock_level: int
    unit: str

    class Config:
        from_attributes = True

class InventoryLogResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str]
    quantity_changed: int
    change_type: str
    reason: Optional[str]
    timestamp: Optional[str]

    class Config:
        from_attributes = True

class InventoryDetailResponse(BaseModel):
    inventory: InventoryResponse
    logs: List[InventoryLogResponse]

# --- Sale Schemas ---
class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    sale_price: Optional[float] = None
    sale_date: Optional[str] = None  # ISO format string

class SaleResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str]
    quantity: int
    sale_price: float
    total_amount: float
    sale_date: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True

class SalesSummaryResponse(BaseModel):
    total_revenue: float
    total_sales_count: int
    total_items_sold: int
    best_seller: Optional[str]
    best_seller_qty: int

# --- Forecast Schemas ---
class TrainModelRequest(BaseModel):
    product_id: Optional[int] = None

class PredictDemandRequest(BaseModel):
    product_id: int
    days: Optional[int] = 14
    start_date: Optional[str] = None

class PredictDemandResponse(BaseModel):
    product_id: int
    product_name: str
    forecast: List[dict]

class ForecastResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str]
    forecast_date: str
    predicted_quantity: float
    created_at: Optional[str]

    class Config:
        from_attributes = True
