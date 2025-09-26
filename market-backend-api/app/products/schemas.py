"""
Product related Pydantic schemas.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from app.database.connection import PyObjectId


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class ProductBase(BaseModel):
    name: str
    product_id: Optional[str] = None
    description: Optional[str] = None
    price: float  # Backward compatibility - will be used as selling price
    selling_price: Optional[float] = None  # New explicit selling price field
    buying_price: Optional[float] = None  # New buying price field
    expiry_date: Optional[datetime] = None  # New expiry date field
    size_unit: Literal["piece", "dozen"] = "piece"  # New size unit field
    quantity: int
    category_id: str
    discount: Optional[float] = 0.0
    sku: Optional[str] = None

    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v

    @validator('selling_price')
    def validate_selling_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Selling price must be greater than 0')
        return v

    @validator('buying_price')
    def validate_buying_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Buying price must be greater than 0')
        return v

    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v

    @validator('discount')
    def validate_discount(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Discount must be between 0 and 100')
        return v

    @validator('expiry_date')
    def validate_expiry_date(cls, v):
        if v is not None and v.date() < datetime.now().date():
            raise ValueError('Expiry date cannot be in the past')
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_id: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    selling_price: Optional[float] = None
    buying_price: Optional[float] = None
    expiry_date: Optional[datetime] = None
    size_unit: Optional[Literal["piece", "dozen"]] = None
    quantity: Optional[int] = None
    category_id: Optional[str] = None
    discount: Optional[float] = None
    sku: Optional[str] = None
    is_active: Optional[bool] = None

    @validator('price')
    def validate_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Price must be greater than 0')
        return v

    @validator('selling_price')
    def validate_selling_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Selling price must be greater than 0')
        return v

    @validator('buying_price')
    def validate_buying_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Buying price must be greater than 0')
        return v

    @validator('quantity')
    def validate_quantity(cls, v):
        if v is not None and v < 0:
            raise ValueError('Quantity cannot be negative')
        return v

    @validator('discount')
    def validate_discount(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Discount must be between 0 and 100')
        return v

    @validator('expiry_date')
    def validate_expiry_date(cls, v):
        if v is not None and v.date() < datetime.now().date():
            raise ValueError('Expiry date cannot be in the past')
        return v


class ProductResponse(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    product_id: Optional[str] = None
    description: Optional[str] = None
    price: float
    selling_price: Optional[float] = None
    buying_price: Optional[float] = None
    expiry_date: Optional[datetime] = None
    size_unit: str = "piece"
    quantity: int
    category_id: str
    category_name: Optional[str] = None  # Added category name field
    discount: Optional[float] = 0.0
    sku: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    final_price: float
    is_low_stock: bool
    stock_status: str
    is_expired: Optional[bool] = False  # New field to indicate if product is expired
    days_until_expiry: Optional[int] = None  # New field to show days until expiry
    
    class Config:
        populate_by_name = True


class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryWithProducts(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    products: List[ProductResponse] = []

    class Config:
        populate_by_name = True


class StockUpdate(BaseModel):
    quantity: int

    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v


class ProductFilter(BaseModel):
    category_id: Optional[str] = None
    search: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    in_stock_only: Optional[bool] = None
    low_stock_only: Optional[bool] = None
