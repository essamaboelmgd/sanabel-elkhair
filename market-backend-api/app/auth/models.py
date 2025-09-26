"""
Authentication related models for MongoDB.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


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


class UserRole(str, Enum):
    ADMIN = "admin"
    CASHIER = "cashier"
    CUSTOMER = "customer"


class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    phone: str
    password_hash: Optional[str] = None
    role: UserRole
    is_active: bool = True
    wallet_balance: Optional[float] = 0.0
    first_login: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}


class UserCreate(BaseModel):
    name: str
    phone: str
    password: str
    role: UserRole


class UserLogin(BaseModel):
    phone: str
    password: str
    role: UserRole


class TokenData(BaseModel):
    phone: Optional[str] = None
    role: Optional[str] = None


class Session(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    token: str
    role: UserRole
    expires_at: datetime
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_used: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}


class SessionCreate(BaseModel):
    user_id: str
    token: str
    role: UserRole
    expires_at: datetime


class SessionResponse(BaseModel):
    session_id: str
    user: User
    expires_at: datetime
    token: str