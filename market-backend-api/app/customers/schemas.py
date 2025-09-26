"""
Customer related Pydantic schemas.
"""

from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


class CustomerBase(BaseModel):
    """Base customer schema."""
    name: str
    phone: str
    wallet_balance: Optional[float] = 0.0
    notes: Optional[str] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        # Basic phone validation
        if not v.isdigit() or len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v
    
    @validator('wallet_balance')
    def validate_wallet_balance(cls, v):
        if v is not None and v < 0:
            raise ValueError('Wallet balance cannot be negative')
        return v


class CustomerCreate(CustomerBase):
    """Customer creation schema."""
    pass


class CustomerUpdate(BaseModel):
    """Customer update schema."""
    name: Optional[str] = None
    phone: Optional[str] = None
    wallet_balance: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    first_login: Optional[bool] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            if not v.isdigit() or len(v) < 10:
                raise ValueError('Phone number must be at least 10 digits')
        return v
    
    @validator('wallet_balance')
    def validate_wallet_balance(cls, v):
        if v is not None and v < 0:
            raise ValueError('Wallet balance cannot be negative')
        return v


class CustomerResponse(CustomerBase):
    """Customer response schema."""
    id: str
    first_login: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    """Customer list response schema."""
    customers: List[CustomerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class WalletTransaction(BaseModel):
    """Wallet transaction schema."""
    amount: float
    transaction_type: str  # "add" or "deduct"
    description: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v
    
    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        if v not in ['add', 'deduct']:
            raise ValueError('Transaction type must be "add" or "deduct"')
        return v


class CustomerFilter(BaseModel):
    """Customer filter schema."""
    search: Optional[str] = None
    has_balance: Optional[bool] = None
    status: Optional[str] = None  # "active", "inactive", "first_login"
    min_balance: Optional[float] = None
    max_balance: Optional[float] = None


class CustomerStats(BaseModel):
    """Customer statistics schema."""
    total_customers: int
    active_customers: int
    inactive_customers: int
    first_login_customers: int
    customers_with_balance: int
    total_wallet_balance: float
    average_wallet_balance: float
