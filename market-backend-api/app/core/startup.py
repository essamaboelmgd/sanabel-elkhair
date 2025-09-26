"""
Startup script to initialize default data in MongoDB.
"""

import asyncio
from app.database.connection import get_motor_client
from app.auth.service import AuthService
from app.products.service import ProductService
from app.customers.service import CustomerService

async def initialize_default_data():
    db = get_motor_client()

    try:
        # Create default admin user
        print("Creating default admin user...")
        await AuthService.create_admin_user(db)

        # Initialize default categories
        print("Initializing default categories...")
        categories = await ProductService.initialize_default_categories(db)

        # Create sample products
        print("Creating sample products...")
        sample_products = [
            {
                "name": "آيفون 14",
                "description": "أحدث موديل آيفون",
                "price": 999.0,
                "quantity": 25,
                "category_id": str(categories[0]["_id"]),  # إلكترونيات
                "sku": "IPHONE14-001"
            },
            {
                "name": "تلفزيون سامسونج",
                "description": "تلفزيون ذكي 55 بوصة",
                "price": 599.0,
                "quantity": 8,
                "category_id": str(categories[0]["_id"]),
                "sku": "SAMSUNG-TV-55"
            },
            {
                "name": "حليب",
                "description": "حليب طازج كامل الدسم",
                "price": 3.99,
                "quantity": 50,
                "category_id": str(categories[1]["_id"]),  # بقالة
                "sku": "MILK-FRESH-001"
            },
            {
                "name": "خبز",
                "description": "خبز القمح الكامل",
                "price": 2.49,
                "quantity": 30,
                "category_id": str(categories[1]["_id"]),
                "sku": "BREAD-WHEAT-001"
            }
        ]

        for product_data in sample_products:
            try:
                await ProductService.create_product(db, product_data)
                print(f"Created product: {product_data['name']}")
            except Exception as e:
                print(f"Error creating product {product_data['name']}: {str(e)}")

        # Create sample customers
        print("Creating sample customers...")
        sample_customers = [
            {
                "name": "أحمد محمد",
                "phone": "1234567890",
                "wallet_balance": 50.0
            },
            {
                "name": "فاطمة علي",
                "phone": "0987654321",
                "wallet_balance": 0.0
            }
        ]

        for customer_data in sample_customers:
            try:
                await CustomerService.create_customer(db, customer_data)
                print(f"Created customer: {customer_data['name']}")
            except Exception as e:
                print(f"Error creating customer {customer_data['name']}: {str(e)}")

        print("Default data initialization completed!")

    except Exception as e:
        print(f"Error during initialization: {str(e)}")

if __name__ == "__main__":
    asyncio.run(initialize_default_data())
