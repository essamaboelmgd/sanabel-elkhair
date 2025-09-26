"""
Customer router with endpoints for customer management (MongoDB + Motor).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
import math
from app.auth.dependencies import get_current_admin, get_current_customer, get_current_staff
from app.customers.schemas import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    WalletTransaction, CustomerFilter, CustomerStats, CustomerListResponse
)
from app.customers.service import CustomerService
from app.database.connection import get_db

router = APIRouter()


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    current_admin = Depends(get_current_staff)
):
    """Create a new customer (Admin only)."""
    return await CustomerService.create_customer(customer)


@router.get("/", response_model=CustomerListResponse)
async def get_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    has_balance: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    min_balance: Optional[float] = Query(None, ge=0),
    max_balance: Optional[float] = Query(None, ge=0),
    current_admin = Depends(get_current_staff)
):
    """Get customers with filtering and pagination (Admin only)."""
    filters = CustomerFilter(
        search=search,
        has_balance=has_balance,
        status=status,
        min_balance=min_balance,
        max_balance=max_balance
    )
    skip = (page - 1) * page_size

    customers, total = await CustomerService.get_customers(skip=skip, limit=page_size, filters=filters)

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return CustomerListResponse(
        customers=customers,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/me", response_model=CustomerResponse)
async def get_my_profile(
    current_customer = Depends(get_current_customer)
):
    """Get current customer's profile."""
    # Get customer data from customers collection
    from app.database.connection import db
    
    customer_id = current_customer["id"]  # Use id field from current_customer
    # Convert string ID back to ObjectId for MongoDB query
    from bson import ObjectId
    customer = await db.customers.find_one({"_id": ObjectId(customer_id), "is_active": True})
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Transform customer data to response format
    customer_response = {
        "id": str(customer["_id"]),  # Ensure _id is converted to string
        "name": customer["name"],
        "phone": customer["phone"],
        "wallet_balance": customer.get("wallet_balance", 0.0),
        "is_active": customer.get("is_active", True),
        "first_login": customer.get("first_login", True),
        "created_at": customer["created_at"],
        "updated_at": customer.get("updated_at")
    }
    
    # If customer doesn't have wallet_balance, add it
    if "wallet_balance" not in customer:
        await db.customers.update_one(
            {"_id": customer["_id"]},
            {"$set": {"wallet_balance": 0.0}}
        )
        customer_response["wallet_balance"] = 0.0
    
    return customer_response


@router.get("/stats", response_model=CustomerStats)
async def get_customer_statistics(
    current_admin = Depends(get_current_admin)
):
    """Get customer statistics (Admin only)."""
    return await CustomerService.get_customer_statistics()


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_admin = Depends(get_current_staff)
):
    """Get customer by ID (Admin only)."""
    customer = await CustomerService.get_customer_by_id(customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_update: CustomerUpdate,
    current_admin = Depends(get_current_staff)
):
    """Update a customer (Admin only)."""
    return await CustomerService.update_customer(customer_id, customer_update)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete a customer (Admin only)."""
    success = await CustomerService.delete_customer(customer_id)
    return {"message": "Customer deleted successfully"}


@router.patch("/{customer_id}/wallet", response_model=CustomerResponse)
async def update_customer_wallet(
    customer_id: str,
    wallet_transaction: WalletTransaction,
    current_admin = Depends(get_current_staff)
):
    """Update customer wallet balance (Admin only)."""
    return await CustomerService.update_wallet_balance(
        customer_id,
        wallet_transaction.amount,
        wallet_transaction.transaction_type
    )
