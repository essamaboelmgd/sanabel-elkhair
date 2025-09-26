"""
Dashboard router with analytics and statistics endpoints.
"""

from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
from app.auth.dependencies import get_current_admin
from app.products.service import ProductService
from app.customers.service import CustomerService
from app.invoices.service import InvoiceService
from app.database.connection import db
from app.database.connection import get_db as get_database
from bson import ObjectId

router = APIRouter()


@router.get("/stats")
async def get_dashboard_statistics(current_admin = Depends(get_current_admin)):
    """Get comprehensive dashboard statistics (Admin only)."""
    
    # Products
    products, _ = await ProductService.get_products(skip=0, limit=1000)
    low_stock = await ProductService.get_low_stock_products()
    
    # Customers
    customer_stats = await CustomerService.get_customer_statistics()

    # Invoices
    invoice_stats = await InvoiceService.get_invoice_statistics()
    

    today = datetime.combine(date.today(), datetime.min.time())
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Sales for periods
    async def total_sales(start_date):
        pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date},
                "status": "Paid"
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        result = await db.invoices.aggregate(pipeline).to_list(length=1)
        return result[0]["total"] if result else 0.0

    today_sales = await total_sales(today)
    week_sales = await total_sales(week_ago)
    month_sales = await total_sales(month_ago)

    return {
        "products": {
            "total": len(products),
            "low_stock": len(low_stock)
        },
        "customers": customer_stats,
        "invoices": invoice_stats,
        "sales": {
            "today": today_sales,
            "week": week_sales,
            "month": month_sales,
            "total": invoice_stats["total_revenue"]
        }
    }


@router.get("/sales-trend")
async def get_sales_trend(
    days: int = Query(7, ge=1, le=365),
    current_admin=Depends(get_current_admin)
):
    """Get sales trend for the specified number of days (Admin only)."""
    
    sales_data = []

    for i in range(days):
        day = date.today() - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = datetime.combine(day, datetime.max.time())

        pipeline = [
            {"$match": {
                "created_at": {"$gte": start, "$lte": end},
                "status": "Paid"
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        result = await db.invoices.aggregate(pipeline).to_list(length=1)
        total = result[0]["total"] if result else 0.0

        sales_data.append({
            "date": day.isoformat(),
            "sales": float(total)
        })

    sales_data.reverse()

    return {
        "period": f"Last {days} days",
        "data": sales_data
    }


@router.get("/category-distribution")
async def get_category_distribution(
    current_admin=Depends(get_current_admin)
):
    """Get product distribution by category (Admin only)."""
    
    pipeline = [
        {
            "$match": {"is_active": True}
        },
        {
            "$lookup": {
                "from": "products",
                "localField": "_id",
                "foreignField": "category_id",
                "as": "products"
            }
        },
        {
            "$project": {
                "name": 1,
                "product_count": {"$size": "$products"}
            }
        }
    ]

    categories = await db.categories.aggregate(pipeline).to_list(length=100)

    return {
        "categories": [
            {"name": c["name"], "value": c["product_count"]} for c in categories
        ]
    }


@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    current_admin=Depends(get_current_admin)
):
    """Get recent activities (invoices + customers) (Admin only)."""

    activities = []

    # Last 5 invoices
    invoices_cursor = db.invoices.find().sort("created_at", -1).limit(limit // 2)
    async for inv in invoices_cursor:
        customer = await db.customers.find_one({"_id": ObjectId(inv["customer_id"])})
        customer_name = customer["name"] if customer else "Unknown"
        activities.append({
            "type": "invoice",
            "description": f"New invoice #{str(inv['_id'])[:6]} for {customer_name}",
            "amount": inv["total"],
            "timestamp": inv["created_at"],
            "status": inv["status"]
        })

    # Last 5 customers
    customers_cursor = db.customers.find().sort("created_at", -1).limit(limit // 2)
    async for c in customers_cursor:
        activities.append({
            "type": "customer",
            "description": f"New customer: {c['name']}",
            "phone": c["phone"],
            "timestamp": c["created_at"],
            "status": "active"
        })

    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "activities": activities[:limit]
    }


@router.get("/low-stock-products")
async def get_low_stock_products(
    threshold: int = Query(10, ge=1, le=100),
    current_admin=Depends(get_current_admin)
):
    """Get products with low stock (Admin only)."""
    
    low_stock_products = await ProductService.get_low_stock_products(threshold)
    
    return {
        "products": low_stock_products,
        "threshold": threshold,
        "count": len(low_stock_products)
    }
