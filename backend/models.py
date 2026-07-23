from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
import bcrypt
from database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), default='staff')  # 'admin', 'staff'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    barcode = Column(String(50), unique=True, nullable=True)
    category = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    min_stock_level = Column(Integer, default=10)
    unit = Column(String(20), default='units')  # kg, units, pack, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    inventory = relationship('Inventory', back_populates='product', uselist=False, cascade="all, delete-orphan")
    sales = relationship('Sale', back_populates='product', cascade="all, delete-orphan")
    inventory_logs = relationship('InventoryLog', back_populates='product', cascade="all, delete-orphan")
    forecasts = relationship('Forecast', back_populates='product', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'barcode': self.barcode,
            'category': self.category,
            'price': self.price,
            'cost_price': self.cost_price,
            'description': self.description,
            'image_url': self.image_url,
            'min_stock_level': self.min_stock_level,
            'unit': self.unit,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'current_stock': self.inventory.current_stock if self.inventory else 0
        }

class Inventory(Base):
    __tablename__ = 'inventory'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), unique=True, nullable=False)
    current_stock = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = relationship('Product', back_populates='inventory')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'current_stock': self.current_stock,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'min_stock_level': self.product.min_stock_level if self.product else 0,
            'unit': self.product.unit if self.product else 'units'
        }

class InventoryLog(Base):
    __tablename__ = 'inventory_logs'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    change_type = Column(String(20), nullable=False)  # 'IN', 'OUT', 'ADJUSTMENT'
    reason = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship('Product', back_populates='inventory_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'quantity_changed': self.quantity_changed,
            'change_type': self.change_type,
            'reason': self.reason,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class Sale(Base):
    __tablename__ = 'sales'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    sale_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    sale_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship('Product', back_populates='sales')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'quantity': self.quantity,
            'sale_price': self.sale_price,
            'total_amount': self.total_amount,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Forecast(Base):
    __tablename__ = 'forecasts'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    forecast_date = Column(Date, nullable=False)
    predicted_quantity = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship('Product', back_populates='forecasts')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'forecast_date': self.forecast_date.isoformat() if self.forecast_date else None,
            'predicted_quantity': self.predicted_quantity,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
