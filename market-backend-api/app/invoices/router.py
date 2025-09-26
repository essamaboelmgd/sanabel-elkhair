"""
Invoice router with endpoints for invoice management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime
import math
from app.auth.dependencies import get_current_admin, get_current_user, get_current_customer, get_current_staff
from app.invoices.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListResponse,
    InvoiceFilter, PaymentStatus
)
from app.invoices.service import InvoiceService

router = APIRouter()


# Invoice endpoints
@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice: InvoiceCreate,
    current_admin = Depends(get_current_staff)
):
    """Create a new invoice (Admin only)."""
    return await InvoiceService.create_invoice( invoice)


@router.get("/", response_model=InvoiceListResponse)
async def get_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: Optional[str] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    min_total: Optional[float] = Query(None, ge=0),
    max_total: Optional[float] = Query(None, ge=0),
    min_date: Optional[str] = Query(None),
    max_date: Optional[str] = Query(None),
    current_admin = Depends(get_current_staff)
):
    """Get invoices with filtering and pagination (Admin only)."""
    # Parse dates
    min_date_parsed = datetime.fromisoformat(min_date) if min_date else None
    max_date_parsed = datetime.fromisoformat(max_date) if max_date else None
    
    # Create filter object
    filters = InvoiceFilter(
        customer_id=customer_id,
        status=status,
        min_total=min_total,
        max_total=max_total,
        min_date=min_date_parsed,
        max_date=max_date_parsed
    )
    
    # Calculate skip
    skip = (page - 1) * page_size
    
    # Get invoices
    invoices, total = await InvoiceService.get_invoices( skip=skip, limit=page_size, filters=filters)
    
    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return InvoiceListResponse(
        invoices=invoices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_admin = Depends(get_current_staff)
):
    """Get invoice by ID (Admin only)."""
    try:
        invoice = await InvoiceService.get_invoice_by_id( invoice_id)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Debug logging
        print(f"Debug - Router received invoice: {invoice}")
        print(f"Debug - Invoice keys: {list(invoice.keys())}")
        print(f"Debug - Invoice items: {invoice.get('invoice_items', [])}")
        
        # Validate and return response
        try:
            response = InvoiceResponse(**invoice)
            print(f"Debug - Validated response: {response}")
            return response
        except Exception as validation_error:
            print(f"Validation error: {validation_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Validation error: {str(validation_error)}"
            )
        
    except Exception as e:
        print(f"Error in get_invoice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_update: InvoiceUpdate,
    current_admin = Depends(get_current_staff)
):
    """Update an invoice (Admin only)."""
    print(f"=== Invoice Update Request ===")
    print(f"Invoice ID: {invoice_id}")
    print(f"Update Data: {invoice_update}")
    print(f"Admin: {current_admin.get('name', 'Unknown')}")
    print(f"=============================")
    
    try:
        result = await InvoiceService.update_invoice(invoice_id, invoice_update)
        print(f"=== Invoice Update Success ===")
        print(f"Result: {result}")
        print(f"=============================")
        return result
    except Exception as e:
        print(f"=== Invoice Update Error ===")
        print(f"Error: {e}")
        print(f"=============================")
        raise e


@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: str,
    status: PaymentStatus,
    current_admin = Depends(get_current_staff)
):
    """Update invoice payment status (Admin or Cashier)."""
    return await InvoiceService.update_payment_status( invoice_id, status)


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_admin = Depends(get_current_staff)
):
    """Delete an invoice (Admin or Cashier)."""
    success = await InvoiceService.delete_invoice( invoice_id)
    return {"message": "Invoice deleted successfully"}


@router.get("/stats")
async def get_invoice_statistics(
    current_admin = Depends(get_current_admin)
):
    """Get invoice statistics (Admin only)."""
    stats = await InvoiceService.get_invoice_statistics()
    return stats


@router.get("/customer/{customer_id}", response_model=List[InvoiceResponse])
async def get_customer_invoices(
    customer_id: str
):
    """Get all invoices for a specific customer (Public access)."""
    # Validate customer_id format
    try:
        from bson import ObjectId
        ObjectId(customer_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid customer ID format"
        )
    
    try:
        invoices = await InvoiceService.get_customer_invoices(customer_id)
        print(f"Debug - get_customer_invoices called for customer_id: {customer_id}")
        print(f"Debug - invoices found: {len(invoices) if invoices else 0}")
        
        # Validate each invoice response
        validated_invoices = []
        for invoice in invoices:
            try:
                validated_invoice = InvoiceResponse(**invoice)
                validated_invoices.append(validated_invoice)
            except Exception as validation_error:
                print(f"Warning: Invoice validation failed for {invoice.get('id', 'unknown')}: {validation_error}")
                # Skip invalid invoices instead of failing completely
                continue
        
        print(f"Debug - Validated invoices: {len(validated_invoices)}")
        return validated_invoices
        
    except Exception as e:
        print(f"Error getting customer invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving invoices: {str(e)}"
        )


@router.get("/my-invoices", response_model=List[InvoiceResponse])
async def get_my_invoices(
    customer_id: Optional[str] = Query(None)
):
    """Get all invoices (Public access). If customer_id is provided, filter by customer."""
    # Debug logging
    print(f"Debug - get_my_invoices called")
    print(f"Debug - customer_id parameter: {customer_id}")
    
    # If no customer_id provided, return all invoices
    if not customer_id:
        print("Debug - No customer_id provided, returning all invoices")
        try:
            # Get all invoices using the service's get_invoices method
            all_invoices, total = await InvoiceService.get_invoices(skip=0, limit=1000)
            print(f"Debug - All invoices found: {len(all_invoices) if all_invoices else 0}")
            
            # Validate each invoice response
            validated_invoices = []
            for invoice in all_invoices:
                try:
                    validated_invoice = InvoiceResponse(**invoice)
                    validated_invoices.append(validated_invoice)
                except Exception as validation_error:
                    print(f"Warning: Invoice validation failed for {invoice.get('id', 'unknown')}: {validation_error}")
                    # Skip invalid invoices instead of failing completely
                    continue
            
            print(f"Debug - Validated invoices: {len(validated_invoices)}")
            return validated_invoices
            
        except Exception as e:
            print(f"Error getting all invoices: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving invoices: {str(e)}"
            )
    
    # If customer_id provided, validate format
    try:
        from bson import ObjectId
        ObjectId(customer_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid customer ID format"
        )
    
    print(f"Debug - customer_id: {customer_id}")
    
    try:
        invoices = await InvoiceService.get_customer_invoices(customer_id)
        print(f"Debug - invoices found: {len(invoices) if invoices else 0}")
        
        # Validate each invoice response
        validated_invoices = []
        for invoice in invoices:
            try:
                validated_invoice = InvoiceResponse(**invoice)
                validated_invoices.append(validated_invoice)
            except Exception as validation_error:
                print(f"Warning: Invoice validation failed for {invoice.get('id', 'unknown')}: {validation_error}")
                # Skip invalid invoices instead of failing completely
                continue
        
        print(f"Debug - Validated invoices: {len(validated_invoices)}")
        return validated_invoices
        
    except Exception as e:
        print(f"Error getting customer invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving invoices: {str(e)}"
        )


@router.get("/invoices-public", response_model=List[InvoiceResponse])
async def get_invoices_public(
    customer_id: Optional[str] = Query(None)
):
    """Get all invoices (Public access) - Alternative endpoint."""
    # Debug logging
    print(f"Debug - get_invoices_public called")
    print(f"Debug - customer_id parameter: {customer_id}")
    
    # If no customer_id provided, return all invoices
    if not customer_id:
        print("Debug - No customer_id provided, returning all invoices")
        try:
            # Get all invoices using the service's get_invoices method
            all_invoices, total = await InvoiceService.get_invoices(skip=0, limit=1000)
            print(f"Debug - All invoices found: {len(all_invoices) if all_invoices else 0}")
            
            # Validate each invoice response
            validated_invoices = []
            for invoice in all_invoices:
                try:
                    validated_invoice = InvoiceResponse(**invoice)
                    validated_invoices.append(validated_invoice)
                except Exception as validation_error:
                    print(f"Warning: Invoice validation failed for {invoice.get('id', 'unknown')}: {validation_error}")
                    # Skip invalid invoices instead of failing completely
                    continue
            
            print(f"Debug - Validated invoices: {len(validated_invoices)}")
            return validated_invoices
            
        except Exception as e:
            print(f"Error getting all invoices: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving invoices: {str(e)}"
            )
    
    # If customer_id provided, validate format
    try:
        from bson import ObjectId
        ObjectId(customer_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid customer ID format"
        )
    
    print(f"Debug - customer_id: {customer_id}")
    
    try:
        invoices = await InvoiceService.get_customer_invoices(customer_id)
        print(f"Debug - invoices found: {len(invoices) if invoices else 0}")
        
        # Validate each invoice response
        validated_invoices = []
        for invoice in invoices:
            try:
                validated_invoice = InvoiceResponse(**invoice)
                validated_invoices.append(validated_invoice)
            except Exception as validation_error:
                print(f"Warning: Invoice validation failed for {invoice.get('id', 'unknown')}: {validation_error}")
                # Skip invalid invoices instead of failing completely
                continue
        
        print(f"Debug - Validated invoices: {len(validated_invoices)}")
        return validated_invoices
        
    except Exception as e:
        print(f"Error getting customer invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving invoices: {str(e)}"
        )


@router.get("/my-invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_my_invoice(
    invoice_id: str
):
    """Get a specific invoice by ID (Public access)."""
    # Debug logging
    print(f"Debug - get_my_invoice called for invoice_id: {invoice_id}")
    
    # Validate invoice_id format
    try:
        from bson import ObjectId
        ObjectId(invoice_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invoice ID format"
        )
    
    # Get the invoice
    invoice = await InvoiceService.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    print(f"Debug - Invoice found: {invoice_id}")
    
    # Validate and return response
    try:
        response = InvoiceResponse(**invoice)
        print(f"Debug - Validated response: {response}")
        return response
    except Exception as validation_error:
        print(f"Validation error: {validation_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation error: {str(validation_error)}"
        )
