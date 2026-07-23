import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from config import Config
from database import engine, Base

# Route imports
from routes.auth import auth_router
from routes.products import products_router
from routes.inventory import inventory_router
from routes.sales import sales_router
from routes.forecast import forecast_router
from routes.reports import reports_router

# Initialize FastAPI application
app = FastAPI(
    title="SmartKirana API",
    description="Python FastAPI Backend for SmartKirana Inventory and Forecasting",
    version="1.0.0"
)

# Initialize configuration directories
Config.init_app()

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database tables on startup
Base.metadata.create_all(bind=engine)

# Serving uploads statically
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=Config.UPLOAD_FOLDER), name="uploads")

# Include Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(sales_router, prefix="/api/sales", tags=["Sales"])
app.include_router(forecast_router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

@app.get("/health")
def health_check():
    return {'status': 'healthy', 'message': 'SmartKirana backend is running'}

# Exception handlers
@app.exception_handler(404)
def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={'message': 'Resource not found'})

@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    # Log the exception details if needed
    return JSONResponse(
        status_code=500,
        content={'message': 'Internal server error', 'error': str(exc)}
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
