"""
Categories router with CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.auth.dependencies import get_current_admin, get_current_staff
from app.products.service import ProductService
from app.products.schemas import CategoryCreate, CategoryUpdate
from app.products.models import Category

router = APIRouter()


@router.get("/")
async def get_categories(current_admin=Depends(get_current_staff)):
    """Get all categories (Admin or Cashier)."""
    try:
        categories = await ProductService.get_categories()
        return categories
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.post("/")
async def create_category(
    category: CategoryCreate,
    current_admin=Depends(get_current_admin)
):
    """Create a new category (Admin only)."""
    try:
        new_category = await ProductService.create_category(category)
        return new_category
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.get("/{category_id}")
async def get_category(
    category_id: str,
    current_admin=Depends(get_current_admin)
):
    """Get a specific category by ID (Admin only)."""
    try:
        category = await ProductService.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        return category
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch category: {str(e)}"
        )


@router.put("/{category_id}")
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_admin=Depends(get_current_admin)
):
    """Update a category (Admin only)."""
    try:
        updated_category = await ProductService.update_category(category_id, category_update)
        if not updated_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        return updated_category
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update category: {str(e)}"
        )


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_admin=Depends(get_current_admin)
):
    """Delete a category (Admin only)."""
    try:
        success = await ProductService.delete_category(category_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        return {"message": "Category deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete category: {str(e)}"
        )
