"""
Customer service layer.
"""

from typing import List, Optional, Tuple
from fastapi import HTTPException, status
import math
from datetime import datetime
from bson import ObjectId
import re
from app.customers.models import Customer
from app.customers.schemas import CustomerCreate, CustomerUpdate, CustomerFilter
from app.database.connection import db


class CustomerService:
    """Customer service class."""
    
    @staticmethod
    async def create_customer(customer: CustomerCreate) -> Customer:
        """Create a new customer."""
        # Check if customer already exists
        existing_customer = await db.customers.find_one({"phone": customer.phone})
        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer with this phone number already exists"
            )
        
        customer_data = customer.dict()
        customer_data["created_at"] = datetime.utcnow()
        customer_data["is_active"] = True
        customer_data["first_login"] = True
        customer_data["wallet_balance"] = 0.0

        insert_result = await db.customers.insert_one(customer_data)
        created_customer = await db.customers.find_one({"_id": insert_result.inserted_id})

        created_customer["id"] = str(created_customer["_id"])
        return created_customer

    
    @staticmethod
    async def get_customers(
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[CustomerFilter] = None
    ) -> Tuple[List[Customer], int]:
        """Get customers with filtering and pagination."""
        query = {"is_active": True}

        if filters:
            if filters.search:
                query["$or"] = [
                    {"name": {"$regex": filters.search, "$options": "i"}},
                    {"phone": {"$regex": filters.search, "$options": "i"}},
                ]
            if filters.has_balance is not None:
                if filters.has_balance:
                    query["wallet_balance"] = {"$gt": 0}
                else:
                    query["wallet_balance"] = {"$lte": 0}

            if filters.status == "active":
                query["first_login"] = False
            elif filters.status == "inactive":
                query["is_active"] = False
            elif filters.status == "first_login":
                query["first_login"] = True
            if filters.min_balance is not None:
                query.setdefault("wallet_balance", {}).update({"$gte": filters.min_balance})
            if filters.max_balance is not None:
                query.setdefault("wallet_balance", {}).update({"$lte": filters.max_balance})

        total = await db.customers.count_documents(query)
        cursor = db.customers.find(query).skip(skip).limit(limit)
        customers = []
        async for customer in cursor:
            customer["id"] = str(customer["_id"])
            customers.append(customer)

        return customers, total

    
    @staticmethod
    async def get_customer_by_id(customer_id: str) -> Optional[Customer]:
        """Get customer by ID."""
        customer = await db.customers.find_one({"_id": ObjectId(customer_id), "is_active": True})
        if customer:
            customer["id"] = str(customer["_id"])
        return customer

    
    @staticmethod
    async def update_customer(customer_id: str, customer_update: CustomerUpdate) -> Optional[Customer]:
        """Update a customer."""
        customer = await CustomerService.get_customer_by_id(customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        update_data = {k: v for k, v in customer_update.dict().items() if v is not None}
        await db.customers.update_one({"_id": ObjectId(customer_id)}, {"$set": update_data})
        updated_customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
        if updated_customer:
            updated_customer["id"] = str(updated_customer["_id"])
        return updated_customer

    
    @staticmethod
    async def delete_customer(customer_id: str) -> bool:
        """Soft delete a customer."""
        customer = await CustomerService.get_customer_by_id(customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        result = await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0

    
    @staticmethod
    async def update_wallet_balance(customer_id: str, amount: float, transaction_type: str) -> Customer:
        """Update customer wallet balance."""
        customer = await db.customers.find_one({"_id": ObjectId(customer_id), "is_active": True})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        new_balance = customer.get("wallet_balance", 0.0)
        if transaction_type == "add":
            new_balance += amount
        elif transaction_type == "deduct":
            if new_balance < amount:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance")
            new_balance -= amount
        else:
            raise HTTPException(status_code=400, detail="Invalid transaction type")

        await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"wallet_balance": new_balance}}
        )

        updated_customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
        if updated_customer:
            updated_customer["id"] = str(updated_customer["_id"])
        return updated_customer

    
    @staticmethod
    async def get_customer_statistics() -> dict:
        """Get customer statistics."""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_customers": {"$sum": 1},
                    "active_customers": {
                        "$sum": {
                            "$cond": [{"$and": [{"$eq": ["$is_active", True]}, {"$eq": ["$first_login", False]}]}, 1, 0]
                        }
                    },
                    "inactive_customers": {
                        "$sum": {"$cond": [{"$eq": ["$is_active", False]}, 1, 0]}
                    },
                    "first_login_customers": {
                        "$sum": {"$cond": [{"$eq": ["$first_login", True]}, 1, 0]}
                    },
                    "customers_with_balance": {
                        "$sum": {"$cond": [{"$gt": ["$wallet_balance", 0]}, 1, 0]}
                    },
                    "total_wallet_balance": {"$sum": "$wallet_balance"}
                }
            }
        ]

        result = await db.customers.aggregate(pipeline).to_list(length=1)
        stats = result[0] if result else {}

        total_customers = stats.get("total_customers", 0)
        average_wallet_balance = stats["total_wallet_balance"] / total_customers if total_customers else 0.0

        return {
            "total_customers": total_customers,
            "active_customers": stats.get("active_customers", 0),
            "inactive_customers": stats.get("inactive_customers", 0),
            "first_login_customers": stats.get("first_login_customers", 0),
            "customers_with_balance": stats.get("customers_with_balance", 0),
            "total_wallet_balance": stats.get("total_wallet_balance", 0.0),
            "average_wallet_balance": average_wallet_balance
        }

