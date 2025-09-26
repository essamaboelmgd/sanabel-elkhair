from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, date
from app.database.connection import db
from app.invoices.schemas import InvoiceCreate, InvoiceUpdate, InvoiceFilter, PaymentStatus
from app.invoices.models import Invoice, InvoiceItem
from app.products.models import Product
from app.customers.models import Customer


class InvoiceService:

    @staticmethod
    async def create_invoice(invoice: InvoiceCreate) -> dict:
        customer = await db.customers.find_one({"_id": ObjectId(invoice.customer_id)})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        total_amount = 0
        items_data = []

        for item in invoice.invoice_items:
            product = await db.products.find_one({"_id": ObjectId(item.product_id)})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")

            if product["quantity"] < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product['name']}")

            price = item.price if item.price > 0 else product["price"]
            total = price * item.quantity
            total_amount += total

            items_data.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": price
            })

            # Update stock
            await db.products.update_one(
                {"_id": ObjectId(item.product_id)},
                {"$inc": {"quantity": -item.quantity}}
            )

        # Calculate discount
        discount_amount = 0
        if invoice.discount and invoice.discount > 0:
            if invoice.discount_type == "percentage":
                discount_amount = (total_amount * invoice.discount) / 100
            else:  # fixed amount
                discount_amount = invoice.discount
            
            # Ensure discount doesn't exceed total
            discount_amount = min(discount_amount, total_amount)
            total_amount = max(0, total_amount - discount_amount)

        # Handle wallet operations
        if invoice.wallet_payment and invoice.wallet_payment > 0:
            # Check if customer has sufficient wallet balance
            current_balance = customer.get("wallet_balance", 0)
            if current_balance < invoice.wallet_payment:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient wallet balance. Current: {current_balance}, Required: {invoice.wallet_payment}"
                )
            
            # Deduct from customer wallet
            await db.customers.update_one(
                {"_id": ObjectId(invoice.customer_id)},
                {"$inc": {"wallet_balance": -invoice.wallet_payment}}
            )
            
            # Log wallet transaction
            await db.wallet_transactions.insert_one({
                "customer_id": invoice.customer_id,
                "invoice_id": None,  # Will be updated after invoice creation
                "amount": -invoice.wallet_payment,
                "transaction_type": "deduct",
                "description": "دفع من فاتورة جديدة",
                "created_at": datetime.utcnow()
            })

        if invoice.wallet_add and invoice.wallet_add > 0:
            # Add to customer wallet
            await db.customers.update_one(
                {"_id": ObjectId(invoice.customer_id)},
                {"$inc": {"wallet_balance": invoice.wallet_add}}
            )
            
            # Log wallet transaction
            await db.wallet_transactions.insert_one({
                "customer_id": invoice.customer_id,
                "invoice_id": None,  # Will be updated after invoice creation
                "amount": invoice.wallet_add,
                "transaction_type": "add",
                "description": "إضافة من فاتورة جديدة",
                "created_at": datetime.utcnow()
            })

        invoice_data = {
            "customer_id": invoice.customer_id,
            "total": total_amount,
            "status": invoice.status,
            "notes": invoice.notes,
            "wallet_payment": invoice.wallet_payment or 0.0,
            "wallet_add": invoice.wallet_add or 0.0,
            "discount": invoice.discount or 0.0,
            "discount_type": invoice.discount_type or "percentage",
            "discount_amount": discount_amount,
            "subtotal": total_amount + discount_amount,  # Original amount before discount
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.invoices.insert_one(invoice_data)
        invoice_id = str(result.inserted_id)

        # Update wallet transactions with invoice ID
        if invoice.wallet_payment or invoice.wallet_add:
            await db.wallet_transactions.update_many(
                {"customer_id": invoice.customer_id, "invoice_id": None},
                {"$set": {"invoice_id": invoice_id}}
            )

        for item in items_data:
            await db.invoice_items.insert_one({
                "invoice_id": invoice_id,
                **item
            })

        # Return InvoiceResponse format
        return {
            "id": invoice_id,
            "customer_id": invoice.customer_id,
            "customer_name": customer["name"],
            "total": total_amount,
            "status": invoice.status,
            "notes": invoice.notes,
            "wallet_payment": invoice.wallet_payment or 0.0,
            "wallet_add": invoice.wallet_add or 0.0,
            "created_at": invoice_data["created_at"],
            "updated_at": invoice_data["updated_at"],
            "invoice_items": [
                {
                    "id": str(ObjectId()),
                    "product_id": str(item["product_id"]),
                    "quantity": int(item["quantity"]),
                    "price": float(item["price"])
                }
                for item in items_data
            ]
        }

    @staticmethod
    async def get_invoices(skip=0, limit=100, filters: Optional[InvoiceFilter] = None) -> Tuple[List[dict], int]:
        query = {}

        if filters:
            if filters.customer_id:
                query["customer_id"] = filters.customer_id
            if filters.status:
                query["status"] = filters.status
            if filters.min_total is not None:
                query.setdefault("total", {})["$gte"] = filters.min_total
            if filters.max_total is not None:
                query.setdefault("total", {})["$lte"] = filters.max_total
            if filters.min_date:
                query.setdefault("created_at", {})["$gte"] = filters.min_date
            if filters.max_date:
                query.setdefault("created_at", {})["$lte"] = filters.max_date

        cursor = db.invoices.find(query).sort("created_at", -1).skip(skip).limit(limit)
        invoices_data = []
        
        async for doc in cursor:
            # Get customer name
            customer = await db.customers.find_one({"_id": ObjectId(doc["customer_id"])})
            customer_name = customer["name"] if customer else "Unknown Customer"
            
            # Get invoice items
            items_cursor = db.invoice_items.find({"invoice_id": str(doc["_id"])})
            invoice_items = []
            async for item in items_cursor:
                invoice_items.append({
                    "id": str(item["_id"]),
                    "product_id": str(item["product_id"]),
                    "quantity": int(item["quantity"]),
                    "price": float(item["price"])
                })
            
            # Create response data
            invoice_response = {
                "id": str(doc["_id"]),
                "customer_id": str(doc["customer_id"]),
                "customer_name": customer_name,
                "total": float(doc["total"]),
                "status": str(doc["status"]),
                "notes": doc.get("notes") or "",
                "wallet_payment": float(doc.get("wallet_payment", 0.0)),
                "wallet_add": float(doc.get("wallet_add", 0.0)),
                "created_at": doc["created_at"],
                "updated_at": doc.get("updated_at"),
                "invoice_items": invoice_items
            }
            invoices_data.append(invoice_response)
            
        total = await db.invoices.count_documents(query)
        return invoices_data, total

    @staticmethod
    async def get_invoice_by_id(invoice_id: str) -> Optional[dict]:
        doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            return None
            
        # Get customer name
        customer = await db.customers.find_one({"_id": ObjectId(doc["customer_id"])})
        customer_name = customer["name"] if customer else "Unknown Customer"
        
        # Get invoice items
        items_cursor = db.invoice_items.find({"invoice_id": str(doc["_id"])})
        invoice_items = []
        async for item in items_cursor:
            invoice_items.append({
                "id": str(item["_id"]),
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "price": item["price"]
            })
        
        # Ensure we have at least one item or create a placeholder
        if not invoice_items:
            print(f"Warning: No invoice items found for invoice {invoice_id}")
            invoice_items = []
        
        # Validate invoice items structure
        for item in invoice_items:
            if not item.get("id"):
                print(f"Warning: Invoice item missing id: {item}")
                item["id"] = str(ObjectId())  # Generate new ID if missing
            if not item.get("product_id"):
                print(f"Warning: Invoice item missing product_id: {item}")
                item["product_id"] = "unknown"
            if not item.get("quantity"):
                print(f"Warning: Invoice item missing quantity: {item}")
                item["quantity"] = 0
            if not item.get("price"):
                print(f"Warning: Invoice item missing price: {item}")
                item["price"] = 0.0
        
        # Ensure all invoice items have required fields
        validated_invoice_items = []
        for item in invoice_items:
            validated_item = {
                "id": str(item.get("id", ObjectId())),
                "product_id": str(item.get("product_id", "unknown")),
                "quantity": int(item.get("quantity", 0)),
                "price": float(item.get("price", 0.0))
            }
            validated_invoice_items.append(validated_item)
        
        invoice_items = validated_invoice_items
        
        # Create response data matching InvoiceResponse schema
        invoice_response = {
            "id": str(doc["_id"]),
            "customer_id": str(doc["customer_id"]),
            "customer_name": str(customer_name or "Unknown Customer"),
            "total": float(doc["total"]),
            "status": str(doc["status"]),
            "notes": str(doc.get("notes") or ""),
            "wallet_payment": float(doc.get("wallet_payment", 0.0)),
            "wallet_add": float(doc.get("wallet_add", 0.0)),
            "created_at": doc["created_at"],
            "updated_at": doc.get("updated_at"),
            "invoice_items": invoice_items or []
        }
        
        # Validate required fields
        required_fields = ["id", "customer_id", "customer_name", "total", "status", "created_at", "invoice_items"]
        for field in required_fields:
            if field not in invoice_response or invoice_response[field] is None:
                print(f"Error: Missing required field '{field}' in invoice response")
                print(f"Field value: {invoice_response.get(field)}")
        
        # Validate invoice items
        if not isinstance(invoice_response["invoice_items"], list):
            print(f"Error: invoice_items is not a list: {type(invoice_response['invoice_items'])}")
            invoice_response["invoice_items"] = []
        
        # Ensure all fields are properly typed
        invoice_response["id"] = str(invoice_response["id"])
        invoice_response["customer_id"] = str(invoice_response["customer_id"])
        invoice_response["customer_name"] = str(invoice_response["customer_name"])
        invoice_response["total"] = float(invoice_response["total"])
        invoice_response["status"] = str(invoice_response["status"])
        invoice_response["notes"] = str(invoice_response["notes"])
        invoice_response["created_at"] = invoice_response["created_at"]
        invoice_response["updated_at"] = invoice_response["updated_at"]
        invoice_response["invoice_items"] = list(invoice_response["invoice_items"])
        
        # Final validation
        print(f"Final validation - All fields present: {all(field in invoice_response for field in required_fields)}")
        print(f"Final validation - invoice_items type: {type(invoice_response['invoice_items'])}")
        print(f"Final validation - invoice_items length: {len(invoice_response['invoice_items'])}")
        
        # Debug logging
        print(f"Debug - Invoice response: {invoice_response}")
        print(f"Debug - Customer name: {customer_name}")
        print(f"Debug - Invoice items count: {len(invoice_items)}")
        print(f"Debug - Response keys: {list(invoice_response.keys())}")
        
        return invoice_response

    @staticmethod
    async def update_invoice(invoice_id: str, update: InvoiceUpdate) -> Optional[dict]:
        invoice = await InvoiceService.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Validate customer if provided
        if update.customer_id:
            customer = await db.customers.find_one({"_id": ObjectId(update.customer_id)})
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")

        # Handle invoice items update
        if update.invoice_items is not None:
            # First, restore original stock quantities
            original_items_cursor = db.invoice_items.find({"invoice_id": invoice_id})
            async for item in original_items_cursor:
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"])},
                    {"$inc": {"quantity": item["quantity"]}}
                )

            # Delete all existing invoice items
            await db.invoice_items.delete_many({"invoice_id": invoice_id})

            # Validate and insert new invoice items
            total_amount = 0
            for item in update.invoice_items:
                # Validate product exists
                product = await db.products.find_one({"_id": ObjectId(item.product_id)})
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")

                # Validate stock availability
                if product["quantity"] < item.quantity:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product['name']}")

                # Calculate item total
                price = item.price if item.price > 0 else product["price"]
                total = price * item.quantity
                total_amount += total

                # Insert new invoice item
                await db.invoice_items.insert_one({
                    "invoice_id": invoice_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price": price
                })

                # Update product stock
                await db.products.update_one(
                    {"_id": ObjectId(item.product_id)},
                    {"$inc": {"quantity": -item.quantity}}
                )

            # Calculate discount
            discount_amount = 0
            if update.discount and update.discount > 0:
                if update.discount_type == "percentage":
                    discount_amount = (total_amount * update.discount) / 100
                else:  # fixed amount
                    discount_amount = update.discount
                
                # Ensure discount doesn't exceed total
                discount_amount = min(discount_amount, total_amount)
                total_amount = max(0, total_amount - discount_amount)

            # Update invoice total - calculate and store in database, not in update object
            print(f"Updated invoice total: {total_amount}")

        # Handle wallet operations
        if update.wallet_payment is not None and update.wallet_payment > 0:
            # Get customer for wallet operations
            customer_id = update.customer_id or invoice["customer_id"]
            customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")
            
            # Check if customer has sufficient wallet balance
            current_balance = customer.get("wallet_balance", 0)
            if current_balance < update.wallet_payment:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient wallet balance. Current: {current_balance}, Required: {update.wallet_payment}"
                )
            
            # Deduct from customer wallet
            await db.customers.update_one(
                {"_id": ObjectId(customer_id)},
                {"$inc": {"wallet_balance": -update.wallet_payment}}
            )
            
            # Log wallet transaction
            await db.wallet_transactions.insert_one({
                "customer_id": customer_id,
                "invoice_id": invoice_id,
                "amount": -update.wallet_payment,
                "transaction_type": "deduct",
                "description": f"دفع من فاتورة رقم {invoice_id}",
                "created_at": datetime.utcnow()
            })

        if update.wallet_add is not None and update.wallet_add > 0:
            # Get customer for wallet operations
            customer_id = update.customer_id or invoice["customer_id"]
            customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")
            
            # Add to customer wallet
            await db.customers.update_one(
                {"_id": ObjectId(customer_id)},
                {"$inc": {"wallet_balance": update.wallet_add}}
            )
            
            # Log wallet transaction
            await db.wallet_transactions.insert_one({
                "customer_id": customer_id,
                "invoice_id": invoice_id,
                "amount": update.wallet_add,
                "transaction_type": "add",
                "description": f"إضافة من فاتورة رقم {invoice_id}",
                "created_at": datetime.utcnow()
            })

        # Update invoice data
        update_data = {k: v for k, v in update.dict().items() if v is not None and k != "invoice_items"}
        update_data["updated_at"] = datetime.utcnow()
        update_data["total"] = total_amount  # Add total to update data
        
        # Add discount fields if provided
        if update.discount is not None:
            update_data["discount"] = update.discount
        if update.discount_type is not None:
            update_data["discount_type"] = update.discount_type
        if "discount_amount" in locals():
            update_data["discount_amount"] = discount_amount
            update_data["subtotal"] = total_amount + discount_amount

        await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": update_data})
        return await InvoiceService.get_invoice_by_id(invoice_id)

    @staticmethod
    async def update_payment_status(invoice_id: str, status_: PaymentStatus) -> dict:
        invoice = await InvoiceService.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": {"status": status_, "updated_at": datetime.utcnow()}})
        return await InvoiceService.get_invoice_by_id(invoice_id)

    @staticmethod
    async def delete_invoice(invoice_id: str) -> bool:
        invoice = await InvoiceService.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        items_cursor = db.invoice_items.find({"invoice_id": invoice_id})
        async for item in items_cursor:
            await db.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"quantity": item["quantity"]}}
            )

        await db.invoice_items.delete_many({"invoice_id": invoice_id})
        await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
        return True

    @staticmethod
    async def get_customer_invoices(customer_id: str) -> List[dict]:
        # Try both string and ObjectId formats for customer_id
        query_conditions = [
            {"customer_id": customer_id},  # String format
            {"customer_id": ObjectId(customer_id)}  # ObjectId format
        ]
        
        # Try to find invoices with either format
        invoices_found = []
        for condition in query_conditions:
            try:
                cursor = db.invoices.find(condition).sort("created_at", -1)
                async for doc in cursor:
                    invoices_found.append(doc)
            except Exception as e:
                print(f"Debug - Query failed for condition {condition}: {e}")
                continue
        
        print(f"Debug - Found {len(invoices_found)} invoices for customer_id: {customer_id}")
        invoices_data = []
        
        for doc in invoices_found:
            print(f"Debug - Processing invoice {doc.get('_id')} with customer_id: {doc.get('customer_id')}")
            
            # Get customer name - try both collections
            # Handle both string and ObjectId formats for customer_id in doc
            doc_customer_id = doc["customer_id"]
            if isinstance(doc_customer_id, str):
                try:
                    doc_customer_id = ObjectId(doc_customer_id)
                except:
                    pass  # Keep as string if not valid ObjectId
            
            customer = await db.customers.find_one({"_id": doc_customer_id})
            if not customer:
                customer = await db.users.find_one({"_id": doc_customer_id})
            customer_name = customer["name"] if customer else "Unknown Customer"
            print(f"Debug - Customer name found: {customer_name}")
            
            # Get invoice items
            items_cursor = db.invoice_items.find({"invoice_id": str(doc["_id"])})
            invoice_items = []
            async for item in items_cursor:
                # Get product name
                product = await db.products.find_one({"product_id": item["product_id"]})
                product_name = product["name"] if product else item["product_id"]
                
                invoice_items.append({
                    "id": str(item["_id"]),
                    "product_id": item["product_id"],
                    "product_name": product_name,
                    "quantity": item["quantity"],
                    "price": item["price"]
                })
            
            # Create response data
            invoice_response = {
                "id": str(doc["_id"]),
                "customer_id": str(doc["customer_id"]),
                "customer_name": customer_name,
                "total": float(doc["total"]),
                "status": str(doc["status"]),
                "notes": doc.get("notes") or "",
                "wallet_payment": float(doc.get("wallet_payment", 0.0)),
                "wallet_add": float(doc.get("wallet_add", 0.0)),
                "created_at": doc["created_at"],
                "updated_at": doc.get("updated_at"),
                "invoice_items": invoice_items
            }
            invoices_data.append(invoice_response)
            
        return invoices_data

    @staticmethod
    async def get_invoice_statistics() -> dict:
        from pymongo import ASCENDING
        from bson.son import SON

        total_invoices = await db.invoices.count_documents({})
        paid = await db.invoices.count_documents({"status": PaymentStatus.PAID})
        pending = await db.invoices.count_documents({"status": PaymentStatus.PENDING})
        partial = await db.invoices.count_documents({"status": PaymentStatus.PARTIAL})

        paid_cursor = db.invoices.find({"status": PaymentStatus.PAID})
        total_revenue = sum([(doc["total"]) async for doc in paid_cursor]) if paid > 0 else 0.0

        avg_pipeline = [
            {"$group": {"_id": None, "avg_total": {"$avg": "$total"}}}
        ]
        avg_result = await db.invoices.aggregate(avg_pipeline).to_list(length=1)
        avg_invoice = avg_result[0]["avg_total"] if avg_result else 0.0

        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())

        today_count = await db.invoices.count_documents({"created_at": {"$gte": today_start, "$lte": today_end}})
        today_revenue_cursor = db.invoices.find({
            "created_at": {"$gte": today_start, "$lte": today_end},
            "status": PaymentStatus.PAID
        })
        today_revenue = sum([(doc["total"]) async for doc in today_revenue_cursor])

        return {
            "total_invoices": total_invoices,
            "paid_invoices": paid,
            "pending_invoices": pending,
            "partial_invoices": partial,
            "total_revenue": total_revenue,
            "average_invoice_value": avg_invoice,
            "today_invoices": today_count,
            "today_revenue": today_revenue
        }
