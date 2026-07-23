import pytest
import os
import io
import shutil
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import app
from database import Base, get_db
from config import Config

# Setup test DB engine
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db_session")
def fixture_db_session():
    # Setup test directories for ML checkpoints and uploads
    test_upload_dir = os.path.join(Config.BASE_DIR, 'test_uploads')
    test_model_dir = os.path.join(Config.BASE_DIR, 'test_models')
    os.makedirs(test_upload_dir, exist_ok=True)
    os.makedirs(test_model_dir, exist_ok=True)
    
    # Backup original Config values
    orig_upload = Config.UPLOAD_FOLDER
    orig_model = Config.MODEL_DIR
    Config.UPLOAD_FOLDER = test_upload_dir
    Config.MODEL_DIR = test_model_dir
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    
    # Cleanup test directories
    if os.path.exists(test_upload_dir):
        shutil.rmtree(test_upload_dir)
    if os.path.exists(test_model_dir):
        shutil.rmtree(test_model_dir)
        
    # Restore original Config values
    Config.UPLOAD_FOLDER = orig_upload
    Config.MODEL_DIR = orig_model

@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(name="auth_headers")
def fixture_auth_headers(client):
    # Register admin user
    client.post('/api/auth/signup', json={
        'username': 'admin',
        'email': 'admin@example.com',
        'password': 'adminpassword',
        'role': 'admin'
    })
    # Login
    res = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'adminpassword'
    })
    token = res.json()['token']
    return {'Authorization': f'Bearer {token}'}

# --- TESTS ---

def test_auth_flow(client):
    # 1. Signup
    res = client.post('/api/auth/signup', json={
        'username': 'staff1',
        'email': 'staff1@example.com',
        'password': 'staffpassword',
        'role': 'staff'
    })
    assert res.status_code == 201
    assert 'User registered successfully' in res.json()['message']
    
    # 2. Duplicate Signup
    res = client.post('/api/auth/signup', json={
        'username': 'staff1',
        'email': 'staff1@example.com',
        'password': 'staffpassword'
    })
    assert res.status_code == 409
    
    # 3. Login
    res = client.post('/api/auth/login', json={
        'username': 'staff1',
        'password': 'staffpassword'
    })
    assert res.status_code == 200
    token = res.json()['token']
    assert token is not None
    
    # 4. Access protected profile
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json()['username'] == 'staff1'

def test_product_crud(client, auth_headers):
    # 1. Create Product
    res = client.post('/api/products', headers=auth_headers, json={
        'name': 'Organic Rice',
        'barcode': '1234567890123',
        'category': 'Grains',
        'price': 120.0,
        'cost_price': 90.0,
        'min_stock_level': 15,
        'unit': 'kg',
        'initial_stock': 100
    })
    assert res.status_code == 201
    p_id = res.json()['product']['id']
    
    # 2. Verify Inventory Auto-Created
    res = client.get(f'/api/inventory/{p_id}', headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data['inventory']['current_stock'] == 100
    assert len(data['logs']) == 1
    assert data['logs'][0]['change_type'] == 'IN'
    
    # 3. Read Product
    res = client.get('/api/products', headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    
    # 4. Update Product
    res = client.put(f'/api/products/{p_id}', headers=auth_headers, json={
        'price': 130.0,
        'min_stock_level': 20
    })
    assert res.status_code == 200
    assert res.json()['product']['price'] == 130.0
    assert res.json()['product']['min_stock_level'] == 20
    
    # 5. Image upload
    res = client.post(
        f'/api/products/{p_id}/image',
        headers=auth_headers,
        files={'image': ('test_image.png', io.BytesIO(b"dummy image data"), 'image/png')}
    )
    assert res.status_code == 200
    assert 'image_url' in res.json()
    
    # 6. Delete Product
    res = client.delete(f'/api/products/{p_id}', headers=auth_headers)
    assert res.status_code == 200
    
    res = client.get(f'/api/products/{p_id}', headers=auth_headers)
    assert res.status_code == 404

def test_inventory_and_sales(client, auth_headers):
    # Create Product
    res = client.post('/api/products', headers=auth_headers, json={
        'name': 'Tea Leaves',
        'barcode': '111222333444',
        'category': 'Beverages',
        'price': 80.0,
        'cost_price': 60.0,
        'min_stock_level': 10,
        'unit': 'pack',
        'initial_stock': 20
    })
    p_id = res.json()['product']['id']
    
    # 1. Check Low Stock Warnings (Stock 20 > Min Stock 10, should be empty)
    res = client.get('/api/inventory/low-stock', headers=auth_headers)
    assert len(res.json()) == 0
    
    # 2. Record Sale (qty = 15)
    res = client.post('/api/sales', headers=auth_headers, json={
        'product_id': p_id,
        'quantity': 15
    })
    assert res.status_code == 201
    assert res.json()['current_stock'] == 5
    
    # 3. Check Low Stock Warnings (Stock 5 <= Min Stock 10, should list product)
    res = client.get('/api/inventory/low-stock', headers=auth_headers)
    assert len(res.json()) == 1
    assert res.json()[0]['id'] == p_id
    
    # 4. Manual Adjustment (Stock-in 50 units)
    res = client.post('/api/inventory/adjust', headers=auth_headers, json={
        'product_id': p_id,
        'quantity': 50,
        'change_type': 'IN',
        'reason': 'Supplier restock'
    })
    assert res.status_code == 200
    assert res.json()['inventory']['current_stock'] == 55
    
    # 5. Over-sales validation (should fail)
    res = client.post('/api/sales', headers=auth_headers, json={
        'product_id': p_id,
        'quantity': 100
    })
    assert res.status_code == 400
    assert 'Insufficient inventory' in res.json()['detail']

def test_ml_forecasting(client, auth_headers):
    # 1. Create Product
    res = client.post('/api/products', headers=auth_headers, json={
        'name': 'Chana',
        'category': 'Pulses',
        'price': 90.0,
        'cost_price': 70.0,
        'initial_stock': 500
    })
    p_id = res.json()['product']['id']
    
    # 2. Seed 12 sales to allow training (min 10)
    for i in range(12):
        sale_date = (datetime.utcnow() - timedelta(days=i)).isoformat()
        res = client.post('/api/sales', headers=auth_headers, json={
            'product_id': p_id,
            'quantity': 5 + i % 3,
            'sale_date': sale_date
        })
        assert res.status_code == 201
        
    # 3. Train Model
    res = client.post('/api/forecast/train', headers=auth_headers, json={
        'product_id': p_id
    })
    assert res.status_code == 200
    train_data = res.json()
    assert train_data['results'][str(p_id)]['status'] == 'success'
    
    # 4. Forecast future demand
    res = client.post('/api/forecast/predict', headers=auth_headers, json={
        'product_id': p_id,
        'days': 5
    })
    assert res.status_code == 200
    pred_data = res.json()
    assert len(pred_data['forecast']) == 5
    assert pred_data['forecast'][0]['predicted_quantity'] >= 0

def test_exports(client, auth_headers):
    # Create product and sale to have some data
    res = client.post('/api/products', headers=auth_headers, json={
        'name': 'Sugar',
        'category': 'Sweeteners',
        'price': 40.0,
        'cost_price': 32.0,
        'initial_stock': 100
    })
    p_id = res.json()['product']['id']
    client.post('/api/sales', headers=auth_headers, json={
        'product_id': p_id,
        'quantity': 5
    })
    
    # 1. Export Sales CSV
    res = client.get('/api/reports/sales/csv', headers=auth_headers)
    assert res.status_code == 200
    assert 'text/csv' in res.headers.get('content-type', '')
    
    # 2. Export Sales Excel
    res = client.get('/api/reports/sales/excel', headers=auth_headers)
    assert res.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in res.headers.get('content-type', '')
    
    # 3. Export Sales PDF
    res = client.get('/api/reports/sales/pdf', headers=auth_headers)
    assert res.status_code == 200
    assert 'application/pdf' in res.headers.get('content-type', '')
    
    # 4. Export Inventory Excel
    res = client.get('/api/reports/inventory/excel', headers=auth_headers)
    assert res.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in res.headers.get('content-type', '')
