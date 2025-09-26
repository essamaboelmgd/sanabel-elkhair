"""
Customer data model using Pydantic for MongoDB.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic import Field
from app.database.pyobjectid import PyObjectId


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


class Customer(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    phone: str
    password_hash: Optional[str] = None  # Add password field for customers
    wallet_balance: float = 0.0
    first_login: bool = True
    is_active: bool = True
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # الخصائص المحسوبة (غير محفوظة في قاعدة البيانات)
    @property
    def has_wallet_balance(self) -> bool:
        return self.wallet_balance > 0

    @property
    def status(self) -> str:
        if not self.is_active:
            return "inactive"
        elif self.first_login:
            return "first_login"
        else:
            return "active"

    class Config:
        allow_population_by_field_name = True  # للسماح بالوصول إلى _id باستخدام id
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

    def __repr__(self):
        return (
            f"<Customer(id={self.id}, name='{self.name}', phone='{self.phone}', "
            f"balance={self.wallet_balance})>"
        )



class CustomerBase(BaseModel):
    """Base Customer schema for shared fields."""
    name: str
    phone: str
    wallet_balance: float = 0.0
    first_login: bool = True
    is_active: bool = True
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    """Customer creation schema."""
    pass


class CustomerInDB(CustomerBase):
    """Customer as stored in MongoDB."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }
        from_attributes = True


class CustomerUpdate(BaseModel):
    """Customer update schema."""
    name: Optional[str] = None
    phone: Optional[str] = None
    wallet_balance: Optional[float] = None
    first_login: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CustomerResponse(CustomerInDB):
    """Customer data to return to frontend."""
    pass
