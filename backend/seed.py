import os
import random
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import User, Product, Inventory, Sale, InventoryLog

def get_multipliers(dt, product_cat):
    weekday = dt.weekday()
    # Weekend multiplier (Friday, Saturday, Sunday)
    wk_mult = 1.3 if weekday >= 4 else 1.0
    
    month = dt.month
    
    # Seasonality
    season_mult = 1.0
    if product_cat == 'Oils':
        if month in [11, 12, 1, 2]:  # Cold weather cooking demand
            season_mult = 1.3
    elif product_cat == 'Beverages':
        if month in [11, 12, 1, 2, 7, 8, 9]:  # Tea in Winter and Monsoon
            season_mult = 1.4
    elif product_cat == 'Grains':
        if month in [4, 5, 11, 12]:  # Post-harvest abundance/purchase
            season_mult = 1.2
            
    # Festivals (Exact dates)
    fest_mult = 1.0
    
    # Holi window: 2025 (March 10-15) and 2026 (March 18-23)
    if (dt.year == 2025 and dt.month == 3 and 10 <= dt.day <= 16) or \
       (dt.year == 2026 and dt.month == 3 and 18 <= dt.day <= 24):
        fest_mult = 1.9 if product_cat in ['Sweeteners', 'Oils', 'Spices', 'Grains'] else 1.2
        
    # Eid window: 2025 (March 27-31) and 2026 (April 8-13)
    elif (dt.year == 2025 and dt.month == 3 and 27 <= dt.day <= 31) or \
         (dt.year == 2026 and dt.month == 4 and 8 <= dt.day <= 13):
        fest_mult = 1.8 if product_cat in ['Grains', 'Sweeteners', 'Beverages'] else 1.1
        
    # Diwali window: 2025 (October 25 - November 5)
    elif dt.year == 2025 and ((dt.month == 10 and dt.day >= 25) or (dt.month == 11 and dt.day <= 6)):
        fest_mult = 2.6 if product_cat in ['Sweeteners', 'Oils', 'Spices', 'Grains'] else 1.6
        
    return wk_mult * season_mult * fest_mult

def seed_database():
    print("Dropping existing database tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating fresh database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Users
        print("Creating users...")
        admin = User(username='admin', email='admin@smartkirana.com', role='admin')
        admin.set_password('adminpassword123')
        
        staff = User(username='staff', email='staff@smartkirana.com', role='staff')
        staff.set_password('staffpassword123')
        
        db.add(admin)
        db.add(staff)
        
        # 2. Create Products
        print("Creating products...")
        product_templates = [
            # name, barcode, category, price, cost_price, description, min_stock, unit, base_demand
            ("Basmati Rice Premium", "8901234001010", "Grains", 110.0, 85.0, "High-quality long-grain Basmati Rice", 50, "kg", 15),
            ("Chana Dal", "8901234001027", "Pulses", 85.0, 65.0, "Premium Chana Dal", 40, "kg", 12),
            ("Mustard Oil 1L", "8901234001034", "Oils", 165.0, 140.0, "Cold-pressed pure Mustard Oil", 30, "liters", 10),
            ("Sunflower Oil 1L", "8901234001041", "Oils", 140.0, 115.0, "Refined Sunflower Oil", 35, "liters", 14),
            ("Premium Tea 500g", "8901234001058", "Beverages", 195.0, 155.0, "Strong CTC black tea", 25, "pack", 8),
            ("Refined Sugar", "8901234001065", "Sweeteners", 45.0, 36.0, "Pure white sulfur-free sugar", 50, "kg", 20),
            ("Turmeric Powder 200g", "8901234001072", "Spices", 60.0, 42.0, "High curcumin ground turmeric", 20, "pack", 6),
            ("Red Chilli Powder 200g", "8901234001089", "Spices", 75.0, 52.0, "Spicy red chilli powder", 20, "pack", 5),
            ("Wheat Flour (Atta) 10kg", "8901234001096", "Grains", 440.0, 370.0, "Whole wheat stone-ground Atta", 30, "pack", 18),
            ("Iodized Salt 1kg", "8901234001102", "Spices", 25.0, 18.0, "Iodized cooking salt", 40, "pack", 25)
        ]
        
        products = []
        for name, barcode, category, price, cost_price, desc, min_stock, unit, base_demand in product_templates:
            p = Product(
                name=name,
                barcode=barcode,
                category=category,
                price=price,
                cost_price=cost_price,
                description=desc,
                min_stock_level=min_stock,
                unit=unit
            )
            db.add(p)
            # Store metadata for seeding sales
            p._base_demand = base_demand
            products.append(p)
            
        db.flush() # assign product IDs
        
        # 3. Create initial inventory
        print("Initializing stock levels...")
        for p in products:
            # We seed starting stock at 250 units
            inv = Inventory(product_id=p.id, current_stock=250)
            db.add(inv)
            
            log = InventoryLog(
                product_id=p.id,
                quantity_changed=250,
                change_type='IN',
                reason='Initial bulk stock seeding'
            )
            db.add(log)
            
        # 4. Generate Sales history (last 365 days)
        print("Generating 1 year of daily sales history...")
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)
        
        current_date = start_date
        sales_to_add = []
        
        while current_date <= end_date:
            for p in products:
                # Calculate quantity using multiplier and a normal distribution
                mult = get_multipliers(current_date, p.category)
                mean_qty = p._base_demand * mult
                std_dev = max(1.0, mean_qty * 0.15)
                qty = int(random.normalvariate(mean_qty, std_dev))
                qty = max(1, qty) # Sale must be at least 1 unit
                
                # Create Sale record
                sale = Sale(
                    product_id=p.id,
                    quantity=qty,
                    sale_price=p.price,
                    total_amount=qty * p.price,
                    sale_date=current_date
                )
                sales_to_add.append(sale)
                
            current_date += timedelta(days=1)
            
        print(f"Adding {len(sales_to_add)} sales records...")
        # Add to session in chunks to avoid memory bottlenecks
        chunk_size = 500
        for i in range(0, len(sales_to_add), chunk_size):
            db.add_all(sales_to_add[i:i+chunk_size])
            
        # Update current inventory stock to a safe, positive value
        print("Adjusting final stock levels...")
        for p in products:
            inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
            if inv:
                # Add enough stock to keep inventories positive after all these sales
                inv.current_stock = random.randint(120, 300)
                
        db.commit()
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    seed_database()
