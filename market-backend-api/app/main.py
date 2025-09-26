"""
Main FastAPI application for the Market Backend API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from app.auth.router import router as auth_router
from app.products.router import router as products_router
from app.categories.router import router as categories_router
from app.customers.router import router as customers_router
from app.invoices.router import router as invoices_router
from app.dashboard.router import router as dashboard_router
from app.database.connection import connect_to_mongo, close_mongo_connection, db

app = FastAPI(
    title="Market Backend API",
    description="Backend API for hypermarket management system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3001", "http://localhost:3000","https://www.sanabelkhair.com","https://sanabelkhair.com"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    from app.config import MONGO_URL, DB_NAME
    app.state.mongo_client = AsyncIOMotorClient(MONGO_URL)
    app.state.db = app.state.mongo_client[DB_NAME]
    print(f"✅ Connected to MongoDB: {MONGO_URL}")
    print(f"✅ Database: {DB_NAME}")

@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.mongo_client.close()
    print("❌ Disconnected from MongoDB")

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])
app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
app.include_router(customers_router, prefix="/api/customers", tags=["Customers"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])

# Print available routes
print("🔗 Available API Routes:")
print("  POST /api/auth/login - User login")
print("  POST /api/auth/logout - User logout")
print("  GET /api/auth/me - Get current user")
print("  POST /api/auth/check-customer - Check customer exists")
print("  POST /api/auth/set-customer-password - Set customer password")
print("  GET /api/products - Get products")
print("  GET /api/customers - Get customers")
print("  GET /api/invoices - Get invoices")
print("  GET /health - Health check")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Market Backend API is running!"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
