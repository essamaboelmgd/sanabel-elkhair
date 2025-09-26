from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
import math
import io
from app.auth.dependencies import get_current_admin, get_current_user, get_current_staff
from app.products.schemas import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse, StockUpdate, ProductFilter
)
from app.products.service import ProductService

router = APIRouter()

# Category endpoints
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new category (Admin only)."""
    return await ProductService.create_category(category)


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Get all categories."""
    categories = await ProductService.get_categories(skip=skip, limit=limit)
    return categories


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user = Depends(get_current_user)
):
    """Get category by ID."""
    category = await ProductService.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_admin = Depends(get_current_admin)
):
    """Update a category (Admin only)."""
    return await ProductService.update_category(category_id, category_update)


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a category (Admin only)."""
    success = await ProductService.delete_category(category_id)
    return {"message": "Category deleted successfully"}


@router.post("/categories/initialize")
async def initialize_categories(
    current_admin = Depends(get_current_admin)
):
    """Initialize default categories (Admin only)."""
    categories = await ProductService.initialize_default_categories()
    return {"message": f"Initialized {len(categories)} categories", "categories": categories}


# Product endpoints
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    current_admin = Depends(get_current_admin)
):
    """Create a new product (Admin only)."""
    return await ProductService.create_product(product)


@router.get("/", response_model=ProductListResponse)
async def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    in_stock_only: Optional[bool] = Query(None),
    low_stock_only: Optional[bool] = Query(None),
    current_user = Depends(get_current_user)
):
    """Get products with filtering and pagination."""
    filters = ProductFilter(
        category_id=category_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        in_stock_only=in_stock_only,
        low_stock_only=low_stock_only
    )
    skip = (page - 1) * page_size
    products, total = await ProductService.get_products(skip=skip, limit=page_size, filters=filters)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return ProductListResponse(
        products=products,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/by-product-id/{product_id}", response_model=ProductResponse)
async def get_product_by_product_id(
    product_id: str,
    current_user = Depends(get_current_user)
):
    """Get product by physical product ID (from QR/barcode)."""
    product = await ProductService.get_product_by_product_id(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user = Depends(get_current_user)
):
    """Get product by ID."""
    product = await ProductService.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_admin = Depends(get_current_admin)
):
    """Update a product (Admin only)."""
    return await ProductService.update_product(product_id, product_update)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a product (Admin only)."""
    success = await ProductService.delete_product(product_id)
    return {"message": "Product deleted successfully"}


@router.patch("/{product_id}/stock", response_model=ProductResponse)
async def update_product_stock(
    product_id: str,
    stock_update: StockUpdate,
    current_admin = Depends(get_current_staff)
):
    """Update product stock (Admin or Cashier)."""
    return await ProductService.update_stock(product_id, stock_update.quantity)


@router.get("/stock/low", response_model=List[ProductResponse])
async def get_low_stock_products(
    current_admin = Depends(get_current_admin)
):
    """Get products with low stock (Admin only)."""
    return await ProductService.get_low_stock_products()

@router.get("/expired", response_model=List[ProductResponse])
async def get_expired_products(
    current_admin = Depends(get_current_admin)
):
    """Get expired products (Admin only)."""
    return await ProductService.get_expired_products()

@router.get("/expiring-soon", response_model=List[ProductResponse])
async def get_expiring_soon_products(
    days: int = Query(7, ge=1, le=30),
    current_admin = Depends(get_current_admin)
):
    """Get products expiring within specified days (Admin only)."""
    return await ProductService.get_expiring_soon_products(days)

@router.get("/export/inventory")
async def export_inventory(
    current_admin = Depends(get_current_admin)
):
    """Export inventory to Excel file (Admin only)."""
    # Get all products without pagination
    all_products, _ = await ProductService.get_products(skip=0, limit=10000)  # Large limit to get all
    
    # Create Excel file in memory
    excel_file = await ProductService.create_inventory_excel(all_products)
    
    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(excel_file),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_export.xlsx"}
    )
