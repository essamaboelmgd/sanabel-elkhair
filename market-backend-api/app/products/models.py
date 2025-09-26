"""
Product and Category models for MongoDB using Pydantic.
"""

from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from pydantic.functional_validators import BeforeValidator
from typing import Optional, Annotated

# هذا النوع يقوم بتحويل ObjectId إلى str قبل التحقق
class PyObjectId(ObjectId):

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {
            "type": "string",
            "pattern": "^[a-fA-F0-9]{24}$"
        }


class Category(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Product(BaseModel):
    id: PyObjectId = Field(alias="_id")
    product_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float  # This will be the selling price (backward compatibility)
    selling_price: Optional[float] = None  # New explicit selling price field
    buying_price: Optional[float] = None  # New buying price field
    expiry_date: Optional[datetime] = None  # New expiry date field
    size_unit: str = "piece"  # New size unit field: "piece" or "dozen"
    quantity: int = 0
    category_id: PyObjectId  # reference to Category._id
    discount: float = 0.0
    sku: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
