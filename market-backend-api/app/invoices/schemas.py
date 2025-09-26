"""
Invoice related Pydantic schemas.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.invoices.models import PaymentStatus


class InvoiceItemBase(BaseModel):
    """Base invoice item schema."""
    product_id: str
    quantity: int
    price: float


class InvoiceItemCreate(InvoiceItemBase):
    """Invoice item creation schema."""
    pass


class InvoiceItemResponse(InvoiceItemBase):
    """Invoice item response schema."""
    id: str  # Make id required for response


class InvoiceBase(BaseModel):
    """Base invoice schema."""
    customer_id: str
    status: PaymentStatus = PaymentStatus.PENDING
    notes: Optional[str] = None
    wallet_payment: Optional[float] = 0.0
    wallet_add: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    discount_type: Optional[str] = "percentage"  # "percentage" or "fixed"


class InvoiceCreate(InvoiceBase):
    """Invoice creation schema."""
    invoice_items: List[InvoiceItemCreate]


class InvoiceItemUpdate(BaseModel):
    """Invoice item update schema."""
    id: Optional[str] = None  # For existing items
    product_id: str
    quantity: int
    price: float

class InvoiceUpdate(BaseModel):
    """Invoice update schema."""
    customer_id: Optional[str] = None
    notes: Optional[str] = None
    invoice_items: Optional[List[InvoiceItemUpdate]] = None
    wallet_payment: Optional[float] = None
    wallet_add: Optional[float] = None
    status: Optional[PaymentStatus] = None
    discount: Optional[float] = None
    discount_type: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    """Invoice response schema."""
    id: Optional[str] = None
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer_name: str
    invoice_items: List[InvoiceItemResponse]
    notes: Optional[str] = None  # Override from base class to make it optional


class InvoiceListResponse(BaseModel):
    """Invoice list response schema."""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvoiceFilter(BaseModel):
    """Invoice filter schema."""
    customer_id: Optional[str] = None
    status: Optional[PaymentStatus] = None
    min_total: Optional[float] = None
    max_total: Optional[float] = None
    min_date: Optional[datetime] = None
    max_date: Optional[datetime] = None
