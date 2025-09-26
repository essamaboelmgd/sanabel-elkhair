"""
Invoice and InvoiceItem models for MongoDB using Pydantic.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import Field
from app.database.pyobjectid import PyObjectId


class PaymentStatus(str, Enum):
    """Payment status enum."""
    PAID = "Paid"
    PENDING = "Pending"
    PARTIAL = "Partial"


class Invoice(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    customer_id: str  # reference to Customer._id
    total: float
    status: PaymentStatus = PaymentStatus.PENDING
    notes: Optional[str] = None
    wallet_payment: Optional[float] = Field(default=0.0, description="المبلغ المدفوع من المحفظة")
    wallet_add: Optional[float] = Field(default=0.0, description="المبلغ المضاف للمحفظة")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class InvoiceItem(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    invoice_id: str  # reference to Invoice._id
    product_id: str  # reference to Product._id
    quantity: int
    price: float  # unit price
